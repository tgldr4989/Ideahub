"""End-to-end check of the Idea Hub API.

Starts server.py against a throwaway "ideahub_test" database (same PostgreSQL server as
DATABASE_URL) and a temporary uploads folder, runs the checks, then drops the test database.

Run:  python tests/smoke_test.py
"""
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

import psycopg2
import psycopg2.extensions
from psycopg2 import sql

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import server  # noqa: E402  (reads .env, gives us DATABASE_URL)

PORT = 8765
BASE = f"http://127.0.0.1:{PORT}"
TEST_DB = "ideahub_test"

params = psycopg2.extensions.parse_dsn(server.DATABASE_URL)
test_url = psycopg2.extensions.make_dsn(**dict(params, dbname=TEST_DB))
admin_url = psycopg2.extensions.make_dsn(**dict(params, dbname="postgres"))


def drop_test_db():
    conn = psycopg2.connect(admin_url)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(TEST_DB)))
    conn.close()


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))


def call(op, method, path, body=None, ctype="application/json"):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", ctype)
    try:
        with op.open(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


fails = 0


def check(name, cond, extra=""):
    global fails
    print(("PASS " if cond else "FAIL ") + name, "" if cond else extra)
    fails += not cond


def wait_for_server(proc):
    for _ in range(50):
        if proc.poll() is not None:
            raise SystemExit("server exited:\n" + proc.stderr.read().decode())
        try:
            urllib.request.urlopen(BASE + "/api/me")
            return
        except OSError:
            time.sleep(0.2)
    raise SystemExit("server did not start")


drop_test_db()
uploads = tempfile.mkdtemp()
env = dict(os.environ, PORT=str(PORT), DATABASE_URL=test_url, IDEAHUB_UPLOADS=uploads,
           IDEAHUB_AUTH="dev", HOST="127.0.0.1")
proc = subprocess.Popen([sys.executable, os.path.join(ROOT, "server.py")], env=env,
                        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
try:
    wait_for_server(proc)
    a, b, anon = client(), client(), client()
    check("anon cannot list", call(anon, "GET", "/api/ideas")[0] == 401)
    check("missing password rejected", call(a, "POST", "/api/login", {"email": "x@coremind.mn"})[0] == 400)
    s, r = call(a, "POST", "/api/login", {"email": "Saruul@coremind.mn", "password": "x"})
    check("login A", s == 200 and r["user"]["email"] == "saruul@coremind.mn", r)
    check("me A", call(a, "GET", "/api/me")[1]["user"]["name"] == "saruul")
    call(b, "POST", "/api/login", {"email": "bat", "password": "x"})

    check("empty title rejected", call(a, "POST", "/api/ideas", {"type": "hack", "title": "  "})[0] == 400)
    check("bad type rejected", call(a, "POST", "/api/ideas", {"type": "x", "title": "t"})[0] == 400)
    check("non-JSON rejected", call(a, "POST", "/api/ideas", {"type": "hack", "title": "t"}, "text/plain")[0] == 415)
    svg = "data:image/svg+xml;base64," + base64.b64encode(b"<svg/>").decode()
    check("svg image rejected", call(a, "POST", "/api/ideas", {"type": "hack", "title": "t", "image": svg})[0] == 400)
    fake = "data:image/png;base64," + base64.b64encode(b"<script>alert(1)</script>").decode()
    check("fake png rejected", call(a, "POST", "/api/ideas", {"type": "hack", "title": "t", "image": fake})[0] == 400)

    s, r = call(a, "POST", "/api/ideas", {"type": "proc", "title": "No-meeting Wednesdays", "desc": "Focus time",
                                          "tags": ["Culture", "#Culture", "Focus"]})
    check("create text idea", s == 201 and r["idea"]["mine"] and r["idea"]["tags"] == ["Culture", "Focus"], r)
    idea1 = r["idea"]["id"]
    check("timestamp in ms", abs(r["idea"]["t"] - time.time() * 1000) < 60_000, r)
    s, r = call(a, "POST", "/api/ideas", {"type": "hack", "title": "No tags"})
    check("idea without tags", s == 201 and r["idea"]["tags"] == [], r)
    png = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                        "1f15c4890000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082")
    s, r = call(b, "POST", "/api/ideas", {"type": "hack", "title": "Parking app",
                                          "image": "data:image/png;base64," + base64.b64encode(png).decode()})
    check("create image idea", s == 201 and r["idea"]["img"].startswith("/uploads/"), r)
    idea2, img_url = r["idea"]["id"], r["idea"]["img"]
    check("image saved in uploads folder", os.listdir(uploads) == [img_url.rsplit("/", 1)[1]])
    with urllib.request.urlopen(BASE + img_url) as resp:
        check("image served", resp.headers["Content-Type"] == "image/png" and resp.read() == png)

    # one reaction per employee per idea
    call(a, "PUT", f"/api/ideas/{idea1}/reaction", {"kind": "fire"})
    s, r = call(a, "PUT", f"/api/ideas/{idea1}/reaction", {"kind": "fire"})
    check("same reaction twice = still 1", r["r"] == {"fire": 1}, r)
    s, r = call(a, "PUT", f"/api/ideas/{idea1}/reaction", {"kind": "heart"})
    check("switching moves the reaction", r["r"] == {"heart": 1}, r)
    s, r = call(b, "PUT", f"/api/ideas/{idea1}/reaction", {"kind": "heart"})
    check("second employee adds one", r["r"] == {"heart": 2}, r)
    check("unknown reaction rejected", call(b, "PUT", f"/api/ideas/{idea1}/reaction", {"kind": "poop"})[0] == 400)
    s, r = call(a, "PUT", f"/api/ideas/{idea1}/reaction", {"kind": None})
    check("removing reaction", r["r"] == {"heart": 1} and r["myReaction"] is None, r)
    call(b, "PUT", f"/api/ideas/{idea2}/reaction", {"kind": "rocket"})

    s, r = call(b, "GET", "/api/ideas")
    by_id = {i["id"]: i for i in r["ideas"]}
    check("list shows shared counts", by_id[idea1]["r"] == {"heart": 1} and by_id[idea1]["myReaction"] == "heart")
    check("list marks own ideas", by_id[idea2]["mine"] and not by_id[idea1]["mine"])

    check("cannot delete others' idea", call(b, "DELETE", f"/api/ideas/{idea1}")[0] == 403)
    check("react on missing idea 404", call(a, "PUT", "/api/ideas/9999/reaction", {"kind": "fire"})[0] == 404)
    check("delete own idea", call(b, "DELETE", f"/api/ideas/{idea2}")[0] == 200)
    check("image file removed with idea", not os.listdir(uploads))

    for path in ["/server.py", "/../server.py", "/.env", "/%2e%2e/.env", "/assets/", "/uploads/../server.py"]:
        try:
            urllib.request.urlopen(BASE + path)
            check(f"blocked {path}", False)
        except urllib.error.HTTPError as e:
            check(f"blocked {path}", e.code == 404, e.code)

    call(a, "POST", "/api/logout", {})
    check("logout ends session", call(a, "GET", "/api/ideas")[0] == 401)
finally:
    proc.terminate()
    proc.wait()
    err = proc.stderr.read().decode()
    if "Traceback" in err:
        print(err)
        fails += 1
    drop_test_db()
    shutil.rmtree(uploads, ignore_errors=True)

print("\nFAILURES:", fails)
sys.exit(1 if fails else 0)
