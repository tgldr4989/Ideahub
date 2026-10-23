"""Coremind Idea Hub server — Python standard library only (3.9+), no installs needed.

Run:   python server.py          -> http://localhost:8000
Env:   HOST                    address to listen on (default 127.0.0.1 = this computer only;
                               use 0.0.0.0 to let others on the network connect)
       PORT                    port to listen on (default 8000)
       IDEAHUB_DATA            folder for the SQLite database and uploaded images (default ./data)
       IDEAHUB_EMAIL_DOMAIN    e.g. "coremind.mn" — only emails on this domain may sign in
"""
import base64
import hashlib
import json
import os
import random
import re
import secrets
import sqlite3
import time
import traceback
import uuid
from contextlib import closing
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
DATA = os.environ.get("IDEAHUB_DATA", os.path.join(ROOT, "data"))
UPLOADS = os.path.join(DATA, "uploads")
DB_PATH = os.path.join(DATA, "ideahub.db")
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
EMAIL_DOMAIN = os.environ.get("IDEAHUB_EMAIL_DOMAIN", "").strip().lower().lstrip("@")

REACTIONS = {"bulb", "fire", "rocket", "clap", "heart"}
TYPES = {"hack", "proc"}
MAX_BODY = 8 * 1024 * 1024
MAX_IMAGE = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
SESSION_COOKIE = "ideahub_session"
SESSION_SECONDS = 90 * 24 * 3600
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
UPLOAD_RE = re.compile(r"^[a-f0-9]{32}\.(jpg|png|webp)$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  dept        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ideas (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('hack', 'proc')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  image       TEXT,
  cover       INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);
-- The primary key is what limits each employee to one reaction per idea.
CREATE TABLE IF NOT EXISTS reactions (
  idea_id     INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (idea_id, user_id)
);
"""


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    os.makedirs(UPLOADS, exist_ok=True)
    with closing(connect()) as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)


def now_ms():
    return int(time.time() * 1000)


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def clean_text(value, field, max_len, required=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise ApiError(400, f"{field} must be text")
    value = value.strip()
    if required and not value:
        raise ApiError(400, f"{field} is required")
    if len(value) > max_len:
        raise ApiError(400, f"{field} must be at most {max_len} characters")
    return value


def save_image(data_url):
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


def reaction_counts(conn, idea_id=None):
    """{idea_id: {kind: count}} for one idea or all of them."""
    sql = "SELECT idea_id, kind, COUNT(*) AS n FROM reactions"
    args = ()
    if idea_id is not None:
        sql += " WHERE idea_id = ?"
        args = (idea_id,)
    counts = {}
    for row in conn.execute(sql + " GROUP BY idea_id, kind", args):
        counts.setdefault(row["idea_id"], {})[row["kind"]] = row["n"]
    return counts


def load_ideas(conn, user_id, idea_id=None):
    sql = """
      SELECT i.*, u.name AS author, u.dept AS dept,
             (SELECT kind FROM reactions r WHERE r.idea_id = i.id AND r.user_id = ?) AS my_reaction
      FROM ideas i JOIN users u ON u.id = i.user_id
    """
    args = [user_id]
    if idea_id is not None:
        sql += " WHERE i.id = ?"
        args.append(idea_id)
    rows = conn.execute(sql + " ORDER BY i.created_at DESC", args).fetchall()
    counts = reaction_counts(conn, idea_id)
    return [{
        "id": r["id"],
        "type": r["type"],
        "title": r["title"],
        "desc": r["description"],
        "tags": json.loads(r["tags"]),
        "img": f"/uploads/{r['image']}" if r["image"] else None,
        "cover": r["cover"],
        "author": r["author"],
        "dept": r["dept"],
        "t": r["created_at"],
        "r": counts.get(r["id"], {}),
        "myReaction": r["my_reaction"],
        "mine": r["user_id"] == user_id,
    } for r in rows]


# ---------------------------------------------------------------- routes

def route(req, conn, method, path):
    user = req.current_user(conn)

    if path == "/api/me" and method == "GET":
        return 200, {"user": user, "emailDomain": EMAIL_DOMAIN}

    if path == "/api/login" and method == "POST":
        body = req.json_body()
        name = clean_text(body.get("name"), "Name", 60, required=True)
        dept = clean_text(body.get("dept"), "Department", 60)
        email = clean_text(body.get("email"), "Email", 120, required=True).lower()
        if not EMAIL_RE.match(email):
            raise ApiError(400, "Enter a valid email address")
        if EMAIL_DOMAIN and not email.endswith("@" + EMAIL_DOMAIN):
            raise ApiError(403, f"Please use your @{EMAIL_DOMAIN} email")
        conn.execute("""
            INSERT INTO users (email, name, dept, created_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET name = excluded.name, dept = excluded.dept
        """, (email, name, dept, now_ms()))
        user_id = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()["id"]
        token = secrets.token_urlsafe(32)
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
        conn.execute("INSERT INTO sessions VALUES (?, ?, ?)",
                     (hash_token(token), user_id, int(time.time()) + SESSION_SECONDS))
        req.set_session_cookie(token, SESSION_SECONDS)
        return 200, {"user": {"id": user_id, "name": name, "dept": dept, "email": email}}

    if path == "/api/logout" and method == "POST":
        token = req.session_token()
        if token:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(token),))
        req.set_session_cookie("", 0)
        return 200, {"ok": True}

    if not user:
        raise ApiError(401, "Please sign in")

    if path == "/api/ideas" and method == "GET":
        return 200, {"ideas": load_ideas(conn, user["id"])}

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
        cur = conn.execute("""
            INSERT INTO ideas (user_id, type, title, description, tags, image, cover, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user["id"], idea_type, title, desc, json.dumps(tags), image, random.randint(1, 4), now_ms()))
        return 201, {"idea": load_ideas(conn, user["id"], cur.lastrowid)[0]}

    m = re.match(r"^/api/ideas/(\d+)(/reaction)?$", path)
    if m:
        idea_id = int(m.group(1))
        idea = conn.execute("SELECT id, user_id, image FROM ideas WHERE id = ?", (idea_id,)).fetchone()
        if not idea:
            raise ApiError(404, "That idea no longer exists")

        if m.group(2) and method == "PUT":
            kind = req.json_body().get("kind")
            if kind is None:
                conn.execute("DELETE FROM reactions WHERE idea_id = ? AND user_id = ?", (idea_id, user["id"]))
            elif kind in REACTIONS:
                conn.execute("""
                    INSERT INTO reactions (idea_id, user_id, kind, created_at) VALUES (?, ?, ?, ?)
                    ON CONFLICT(idea_id, user_id) DO UPDATE SET kind = excluded.kind, created_at = excluded.created_at
                """, (idea_id, user["id"], kind, now_ms()))
            else:
                raise ApiError(400, "Unknown reaction")
            return 200, {"r": reaction_counts(conn, idea_id).get(idea_id, {}), "myReaction": kind}

        if not m.group(2) and method == "DELETE":
            if idea["user_id"] != user["id"]:
                raise ApiError(403, "You can only delete your own ideas")
            conn.execute("DELETE FROM ideas WHERE id = ?", (idea_id,))
            if idea["image"]:
                try:
                    os.remove(os.path.join(UPLOADS, idea["image"]))
                except OSError:
                    pass
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
        try:
            if method in ("POST", "PUT") and not self.headers.get("Content-Type", "").startswith("application/json"):
                raise ApiError(415, "Expected JSON")
            with closing(connect()) as conn, conn:
                status, body = route(self, conn, method, path)
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

    def current_user(self, conn):
        token = self.session_token()
        if not token:
            return None
        row = conn.execute("""
            SELECT u.id, u.name, u.dept, u.email FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > ?
        """, (hash_token(token), int(time.time()))).fetchone()
        return dict(row) if row else None

    def set_session_cookie(self, token, max_age):
        self._cookie = f"{SESSION_COOKIE}={token}; Max-Age={max_age}; Path=/; HttpOnly; SameSite=Lax"


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Idea Hub running on http://localhost:{PORT}  (data: {DATA})")
    if EMAIL_DOMAIN:
        print(f"Sign-in limited to @{EMAIL_DOMAIN} emails")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
