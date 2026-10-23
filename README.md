# Coremind Idea Hub

A shared feed where employees post hackathon ideas and process improvements, and react to them.
The most reacted ideas rise to the top.

## Setup

Needs Python 3.9+ and PostgreSQL.

```bash
pip install -r requirements.txt
cp .env.example .env        # then put your PostgreSQL password in PGPASSWORD
python server.py
```

Then open http://localhost:8000. The database named in `DATABASE_URL` (`ideahub` by default) and its tables are
created automatically on first start.

By default only this computer can open the app. To let colleagues use it, set `HOST=0.0.0.0` on a machine they can
reach and share `http://<that-machine>:8000`.

## Settings (`.env` or environment variables)

| Variable | Default | What it does |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres@localhost:5432/ideahub` | PostgreSQL connection, without the password |
| `PGPASSWORD` | *(none)* | PostgreSQL password, on its own line so characters like `@` need no encoding |
| `IDEAHUB_UPLOADS` | `./uploads` | Folder where uploaded images are saved |
| `HOST` | `127.0.0.1` | Address to listen on; `0.0.0.0` opens it to the network |
| `PORT` | `8000` | Port to listen on |
| `IDEAHUB_EMAIL_DOMAIN` | *(none)* | e.g. `coremind.mn` — only emails on that domain can sign in |

The hackathon countdown date is set by `HACKATHON_DEADLINE` near the top of the script in `public/index.html`.

## How it works

- `server.py` serves `public/` and a small JSON API. Data lives in PostgreSQL in four tables:
  `users`, `sessions`, `ideas` and `reactions`.
- **Images** are saved as files in the uploads folder with random names (`<id>.jpg`). The database only stores the
  file name. The browser shrinks photos to at most 1600px before upload. The server accepts only real JPEG, PNG or
  WebP files up to 5 MB, and deletes the file when its idea is deleted.
- Employees sign in with name, department and work email; the session lasts 90 days.
- Each employee can give **one reaction per idea**. Picking another emoji switches it, and clicking the same one
  removes it. The database enforces this with a primary key on `(idea_id, user_id)`.
- Authors can delete their own ideas.
- The feed refreshes every 15 seconds, so everyone sees new ideas and reactions.

**Backups:** dump the database (`pg_dump ideahub > ideahub.sql`) and copy the uploads folder.

## Tests

```bash
python tests/smoke_test.py
```

Runs the server against a temporary `ideahub_test` database on the same PostgreSQL server, checks the API, then drops it.

## Limits to know about

Sign-in checks the email format and domain but does not verify the email, so someone could sign in with a
colleague's address. For wider use, put the app behind the company's SSO or add an emailed sign-in code.
