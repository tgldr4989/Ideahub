"""Coremind Idea Hub server — PostgreSQL for data, a local folder for images.

Setup: pip install -r requirements.txt, copy .env.example to .env and set PGPASSWORD.
Run:   python server.py          -> http://localhost:8000

Settings (environment variables, or a .env file next to this script):
       DATABASE_URL            postgresql://user@host:5432/ideahub
                               (the database is created on first start if it doesn't exist)
       PGPASSWORD              PostgreSQL password (kept out of the URL so any character works)
       IDEAHUB_UPLOADS         folder where uploaded images are saved (default ./uploads)
       HOST                    address to listen on (default 127.0.0.1 = this computer only;
                               use 0.0.0.0 to let others on the network connect)
       PORT                    port to listen on (default 8000)
       IDEAHUB_SECURE_COOKIE   1 when served over HTTPS (behind the WAF), so the cookie is Secure
       LDAP_SERVER             Active Directory host, e.g. dc.example.local (sign-in is refused if unset)
       LDAP_PORT / LDAP_USE_SSL  636 + true for LDAPS (default), 389 + false for plain LDAP
       LDAP_UPN_DOMAIN         coremind.mn — "bat" is tried as "bat@coremind.mn"
       LDAP_USER_BASE_DN       OU that holds the people allowed in (Coremind staff only)
       IDEAHUB_AUTH            ldap (default) | dev — dev skips AD for local testing and only
                               works when HOST is 127.0.0.1
"""
import base64
import hashlib
import json
import os
import random
import re
import secrets
import threading
import time
import traceback
import uuid
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import ldap3
import psycopg2
import psycopg2.extensions
import psycopg2.extras
import psycopg2.pool
from ldap3.utils.conv import escape_filter_chars
from psycopg2 import sql

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")


def load_env_file(path):
    """Read KEY=VALUE lines from .env; real environment variables win."""
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


load_env_file(os.path.join(ROOT, ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/ideahub")
UPLOADS = os.path.abspath(os.environ.get("IDEAHUB_UPLOADS", os.path.join(ROOT, "uploads")))
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
SECURE_COOKIE = os.environ.get("IDEAHUB_SECURE_COOKIE", "").lower() in {"1", "true", "yes"}

AUTH_MODE = os.environ.get("IDEAHUB_AUTH", "ldap").strip().lower()
LDAP_SERVER = os.environ.get("LDAP_SERVER", "")
LDAP_USE_SSL = os.environ.get("LDAP_USE_SSL", "true").lower() in {"1", "true", "yes"}
LDAP_PORT = int(os.environ.get("LDAP_PORT") or (636 if LDAP_USE_SSL else 389))
LDAP_TIMEOUT = int(os.environ.get("LDAP_TIMEOUT", "8"))
LDAP_UPN_DOMAIN = os.environ.get("LDAP_UPN_DOMAIN", "coremind.mn")
LDAP_USER_BASE_DN = os.environ.get("LDAP_USER_BASE_DN", "")

# AD locks an account after a few bad passwords, so this form must not become a way to lock
# colleagues out: after LOGIN_MAX_FAILS failures an account is refused here for LOGIN_WINDOW.
LOGIN_MAX_FAILS = 5
LOGIN_WINDOW = 10 * 60

REACTIONS = {"bulb", "fire", "rocket", "clap", "heart"}
TYPES = {"hack", "proc"}
MAX_BODY = 8 * 1024 * 1024
MAX_IMAGE = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
SESSION_COOKIE = "ideahub_session"
SESSION_SECONDS = 90 * 24 * 3600
UPLOAD_RE = re.compile(r"^[a-f0-9]{32}\.(jpg|png|webp)$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  dept        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS ideas (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('hack', 'proc')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  image       TEXT,                       -- file name inside the uploads folder
  cover       SMALLINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The primary key is what limits each employee to one reaction per idea.
CREATE TABLE IF NOT EXISTS reactions (
  idea_id     BIGINT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL CHECK (kind IN ('bulb', 'fire', 'rocket', 'clap', 'heart')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS ideas_created_idx ON ideas (created_at DESC);
"""

pool = None


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def ensure_database():
    """Create the database named in DATABASE_URL if it doesn't exist yet."""
    try:
        psycopg2.connect(DATABASE_URL).close()
        return
    except psycopg2.OperationalError as e:
        if "does not exist" not in str(e):
            raise
    params = psycopg2.extensions.parse_dsn(DATABASE_URL)
    name = params.get("dbname")
    conn = psycopg2.connect(**dict(params, dbname="postgres"))
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    conn.close()
    print(f"Created database {name!r}")


def init_db():
    global pool
    os.makedirs(UPLOADS, exist_ok=True)
    ensure_database()
    pool = psycopg2.pool.ThreadedConnectionPool(1, 20, DATABASE_URL)
    conn = pool.getconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(SCHEMA)
    finally:
        pool.putconn(conn)


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


_fails = {}
_fails_lock = threading.Lock()


def check_throttle(key):
    now = time.time()
    with _fails_lock:
        recent = [t for t in _fails.get(key, []) if now - t < LOGIN_WINDOW]
        _fails[key] = recent
        if len(recent) >= LOGIN_MAX_FAILS:
            raise ApiError(429, "Too many failed attempts — wait 10 minutes and try again")


def record_failure(key):
    with _fails_lock:
        _fails.setdefault(key, []).append(time.time())


def to_upn(username):
    """`bat` and `bat@coremind.mn` mean the same person."""
    username = username.strip().lower()
    return username if "@" in username else f"{username}@{LDAP_UPN_DOMAIN}"


def ldap_authenticate(upn, password):
    """Bind to AD as the person themselves, then check they are in the Coremind OU.

    Same approach as the migration console: AD accepts a UPN bind, so no service account is
    needed. Returns {email, name, dept} or None for a wrong password or someone outside the OU
    (both look the same to the caller, so the form never reveals which accounts exist).
    """
    server = ldap3.Server(LDAP_SERVER, port=LDAP_PORT, use_ssl=LDAP_USE_SSL,
                          connect_timeout=LDAP_TIMEOUT)
    conn = ldap3.Connection(server, user=upn, password=password, receive_timeout=LDAP_TIMEOUT)
    try:
        if not conn.bind():
            return None
        # Escaped: the UPN is typed by the user, and * or ) would otherwise rewrite the filter.
        conn.search(LDAP_USER_BASE_DN,
                    f"(&(objectClass=user)(objectCategory=person)(userPrincipalName={escape_filter_chars(upn)}))",
                    search_scope=ldap3.SUBTREE,
                    attributes=["displayName", "mail", "department", "userAccountControl"])
        if not conn.entries:
            print(f"ldap: {upn} authenticated but is outside {LDAP_USER_BASE_DN} — refused")
            return None
        e = conn.entries[0]
        if int(str(e.userAccountControl or 0)) & 2:   # ACCOUNTDISABLE
            return None
        return {"email": (str(e.mail or "") or upn).lower(),
                "name": str(e.displayName or "") or upn.split("@")[0],
                "dept": str(e.department or "")}
    except ldap3.core.exceptions.LDAPException as exc:
        # A directory that is down must not look like a wrong password.
        print(f"ldap: {type(exc).__name__} for {upn}: {exc}")
        raise ApiError(503, "Can't reach the company directory — try again in a minute")
    finally:
        try:
            conn.unbind()
        except Exception:
            pass


def authenticate(username, password):
    upn = to_upn(username)
    if AUTH_MODE == "dev":
        # Local testing only (refused at start-up unless HOST is 127.0.0.1): any password works.
        return {"email": upn, "name": upn.split("@")[0], "dept": ""}
    return ldap_authenticate(upn, password)


def clean_text(value, field, max_len, required=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise ApiError(400, f"{field} must be text")
    value = value.strip().replace("\x00", "")
    if required and not value:
        raise ApiError(400, f"{field} is required")
    if len(value) > max_len:
        raise ApiError(400, f"{field} must be at most {max_len} characters")
    return value


def save_image(data_url):
    """Validate an uploaded image and write it to the uploads folder; returns the file name."""
    m = re.match(r"^data:(image/[a-z]+);base64,(.+)$", data_url or "", re.S)
    if not m or m.group(1) not in IMAGE_TYPES:
        raise ApiError(400, "Image must be a JPEG, PNG or WebP")
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except ValueError:
        raise ApiError(400, "Image data is not valid")
    if len(raw) > MAX_IMAGE:
        raise ApiError(413, "Image must be smaller than 5 MB")
    # check the bytes really are the claimed format, not just the label
    magic_ok = (raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n"
                or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"))
    if not magic_ok:
        raise ApiError(400, "Image must be a JPEG, PNG or WebP")
    name = f"{uuid.uuid4().hex}.{IMAGE_TYPES[m.group(1)]}"
    with open(os.path.join(UPLOADS, name), "wb") as f:
        f.write(raw)
    return name


def remove_image(name):
    if name:
        try:
            os.remove(os.path.join(UPLOADS, name))
        except OSError:
            pass


def reaction_counts(cur, idea_id=None):
    """{idea_id: {kind: count}} for one idea or all of them."""
    query = "SELECT idea_id, kind, COUNT(*) AS n FROM reactions"
    args = ()
    if idea_id is not None:
        query += " WHERE idea_id = %s"
        args = (idea_id,)
    cur.execute(query + " GROUP BY idea_id, kind", args)
    counts = {}
    for row in cur.fetchall():
        counts.setdefault(row["idea_id"], {})[row["kind"]] = row["n"]
    return counts


def load_ideas(cur, user_id, idea_id=None):
    query = """
      SELECT i.id, i.user_id, i.type, i.title, i.description, i.tags, i.image, i.cover,
             (extract(epoch FROM i.created_at) * 1000)::bigint AS t,
             u.name AS author, u.dept AS dept,
             (SELECT kind FROM reactions r WHERE r.idea_id = i.id AND r.user_id = %s) AS my_reaction
      FROM ideas i JOIN users u ON u.id = i.user_id
    """
    args = [user_id]
    if idea_id is not None:
        query += " WHERE i.id = %s"
        args.append(idea_id)
    cur.execute(query + " ORDER BY i.created_at DESC", args)
    rows = cur.fetchall()
    counts = reaction_counts(cur, idea_id)
    return [{
        "id": r["id"],
        "type": r["type"],
        "title": r["title"],
        "desc": r["description"],
        "tags": r["tags"],
        "img": f"/uploads/{r['image']}" if r["image"] else None,
        "cover": r["cover"],
        "author": r["author"],
        "dept": r["dept"],
        "t": r["t"],
        "r": counts.get(r["id"], {}),
        "myReaction": r["my_reaction"],
        "mine": r["user_id"] == user_id,
    } for r in rows]


# ---------------------------------------------------------------- routes

def route(req, cur, method, path):
    user = req.current_user(cur)

    if path == "/api/me" and method == "GET":
        return 200, {"user": user, "emailDomain": LDAP_UPN_DOMAIN}

    if path == "/api/login" and method == "POST":
        body = req.json_body()
        username = clean_text(body.get("email"), "Email", 120, required=True)
        password = body.get("password") or ""
        if not isinstance(password, str) or not password:
            raise ApiError(400, "Enter your password")
        if not re.match(r"^[^@\s]+(@[^@\s]+\.[^@\s]+)?$", username):
            raise ApiError(400, "Enter your work email")
        key = to_upn(username)
        check_throttle(key)
        person = authenticate(username, password)
        if not person:
            record_failure(key)
            raise ApiError(401, "Wrong email or password")
        email, name, dept = person["email"], clean_text(person["name"], "Name", 60), clean_text(person["dept"], "Department", 60)
        cur.execute("""
            INSERT INTO users (email, name, dept) VALUES (%s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET name = excluded.name, dept = excluded.dept
            RETURNING id
        """, (email, name, dept))
        user_id = cur.fetchone()["id"]
        token = secrets.token_urlsafe(32)
        cur.execute("DELETE FROM sessions WHERE expires_at < now()")
        cur.execute("INSERT INTO sessions (token_hash, user_id, expires_at) "
                    "VALUES (%s, %s, now() + %s * interval '1 second')",
                    (hash_token(token), user_id, SESSION_SECONDS))
        req.set_session_cookie(token, SESSION_SECONDS)
        return 200, {"user": {"id": user_id, "name": name, "dept": dept, "email": email}}

    if path == "/api/logout" and method == "POST":
        token = req.session_token()
        if token:
            cur.execute("DELETE FROM sessions WHERE token_hash = %s", (hash_token(token),))
        req.set_session_cookie("", 0)
        return 200, {"ok": True}

    if not user:
        raise ApiError(401, "Please sign in")

    if path == "/api/ideas" and method == "GET":
        return 200, {"ideas": load_ideas(cur, user["id"])}

    if path == "/api/ideas" and method == "POST":
        body = req.json_body()
        idea_type = body.get("type")
        if idea_type not in TYPES:
            raise ApiError(400, "Pick Hackathon idea or Process improvement")
        title = clean_text(body.get("title"), "Title", 90, required=True)
        desc = clean_text(body.get("desc"), "Description", 600)
        tags = body.get("tags") or []
        if not isinstance(tags, list) or len(tags) > 6:
            raise ApiError(400, "Use at most 6 tags")
        tags = [clean_text(t, "Tag", 24).lstrip("#") for t in tags]
        tags = list(dict.fromkeys(t for t in tags if t))
        image = save_image(body["image"]) if body.get("image") else None
        try:
            cur.execute("""
                INSERT INTO ideas (user_id, type, title, description, tags, image, cover)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (user["id"], idea_type, title, desc, tags, image, random.randint(1, 4)))
        except Exception:
            remove_image(image)   # don't leave an orphan file if the insert fails
            raise
        return 201, {"idea": load_ideas(cur, user["id"], cur.fetchone()["id"])[0]}

    m = re.match(r"^/api/ideas/(\d+)(/reaction)?$", path)
    if m:
        idea_id = int(m.group(1))
        cur.execute("SELECT id, user_id, image FROM ideas WHERE id = %s", (idea_id,))
        idea = cur.fetchone()
        if not idea:
            raise ApiError(404, "That idea no longer exists")

        if m.group(2) and method == "PUT":
            kind = req.json_body().get("kind")
            if kind is None:
                cur.execute("DELETE FROM reactions WHERE idea_id = %s AND user_id = %s", (idea_id, user["id"]))
            elif kind in REACTIONS:
                cur.execute("""
                    INSERT INTO reactions (idea_id, user_id, kind) VALUES (%s, %s, %s)
                    ON CONFLICT (idea_id, user_id) DO UPDATE SET kind = excluded.kind, created_at = now()
                """, (idea_id, user["id"], kind))
            else:
                raise ApiError(400, "Unknown reaction")
            return 200, {"r": reaction_counts(cur, idea_id).get(idea_id, {}), "myReaction": kind}

        if not m.group(2) and method == "DELETE":
            if idea["user_id"] != user["id"]:
                raise ApiError(403, "You can only delete your own ideas")
            cur.execute("DELETE FROM ideas WHERE id = %s", (idea_id,))
            req.after_commit = lambda: remove_image(idea["image"])
            return 200, {"ok": True}

    raise ApiError(404, "Not found")


# --------------------------------------------------------------- handler

class Handler(SimpleHTTPRequestHandler):
    server_version = "IdeaHub/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            return self.handle_api("GET", path)
        if path.startswith("/uploads/"):
            return self.serve_upload(path[len("/uploads/"):])
        return super().do_GET()

    def do_POST(self):
        self.handle_api("POST", urlparse(self.path).path)

    def do_PUT(self):
        self.handle_api("PUT", urlparse(self.path).path)

    def do_DELETE(self):
        self.handle_api("DELETE", urlparse(self.path).path)

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def serve_upload(self, name):
        file_path = os.path.join(UPLOADS, name)
        if not UPLOAD_RE.match(name) or not os.path.isfile(file_path):
            return self.send_error(404)
        with open(file_path, "rb") as f:
            data = f.read()
        ext = name.rsplit(".", 1)[1]
        self.send_response(200)
        self.send_header("Content-Type", {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[ext])
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(data)

    # -- API plumbing

    def handle_api(self, method, path):
        self._cookie = None
        self.after_commit = None
        try:
            if method in ("POST", "PUT") and not self.headers.get("Content-Type", "").startswith("application/json"):
                raise ApiError(415, "Expected JSON")
            status, body = self.run_in_transaction(method, path)
            if self.after_commit:
                self.after_commit()
        except ApiError as e:
            status, body = e.status, {"error": str(e)}
        except Exception:
            traceback.print_exc()
            status, body = 500, {"error": "Server error — please try again"}
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if self._cookie:
            self.send_header("Set-Cookie", self._cookie)
        self.end_headers()
        self.wfile.write(data)

    def run_in_transaction(self, method, path):
        conn = pool.getconn()
        broken = False
        try:
            # commits on success, rolls back on any exception
            with conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                return route(self, cur, method, path)
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            broken = True   # e.g. PostgreSQL restarted: drop this connection from the pool
            raise
        finally:
            pool.putconn(conn, close=broken or conn.closed)

    def json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise ApiError(413, "Request is too large")
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            raise ApiError(400, "Invalid JSON")
        if not isinstance(body, dict):
            raise ApiError(400, "Invalid JSON")
        return body

    def session_token(self):
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
        except cookies.CookieError:
            return None
        morsel = jar.get(SESSION_COOKIE)
        return morsel.value if morsel else None

    def current_user(self, cur):
        token = self.session_token()
        if not token:
            return None
        cur.execute("""
            SELECT u.id, u.name, u.dept, u.email FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.expires_at > now()
        """, (hash_token(token),))
        row = cur.fetchone()
        return dict(row) if row else None

    def set_session_cookie(self, token, max_age):
        self._cookie = f"{SESSION_COOKIE}={token}; Max-Age={max_age}; Path=/; HttpOnly; SameSite=Lax"
        if SECURE_COOKIE:
            self._cookie += "; Secure"


if __name__ == "__main__":
    if AUTH_MODE == "dev" and HOST != "127.0.0.1":
        raise SystemExit("IDEAHUB_AUTH=dev lets anyone sign in as anyone — only allowed with HOST=127.0.0.1")
    if AUTH_MODE != "dev" and not (LDAP_SERVER and LDAP_USER_BASE_DN):
        raise SystemExit("Set LDAP_SERVER and LDAP_USER_BASE_DN in .env (or IDEAHUB_AUTH=dev for local testing)")
    try:
        init_db()
    except psycopg2.OperationalError as e:
        raise SystemExit(f"Can't connect to PostgreSQL — check DATABASE_URL in .env\n{e}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Idea Hub running on http://localhost:{PORT}")
    print(f"Images are saved in {UPLOADS}")
    print("Sign-in: DEV MODE, no password check" if AUTH_MODE == "dev"
          else f"Sign-in: Active Directory {LDAP_SERVER}:{LDAP_PORT}, people under {LDAP_USER_BASE_DN}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
