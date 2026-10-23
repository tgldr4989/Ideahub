# Coremind Idea Hub

A shared feed where employees post hackathon ideas and process improvements, and react to them.
The most reacted ideas rise to the top.

## Run

Needs only Python 3.9+ (no packages to install).

```bash
python server.py
```

Then open http://localhost:8000. By default only this computer can open it. To let colleagues use it, start it
with `HOST=0.0.0.0` on a machine they can reach and share `http://<that-machine>:8000`.

## Settings (environment variables)

| Variable | Default | What it does |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Address to listen on; `0.0.0.0` opens it to the network |
| `PORT` | `8000` | Port to listen on |
| `IDEAHUB_DATA` | `./data` | Where the SQLite database (`ideahub.db`) and uploaded images (`uploads/`) live |
| `IDEAHUB_EMAIL_DOMAIN` | *(none)* | e.g. `coremind.mn` — only emails on that domain can sign in |

The hackathon countdown date is set by `HACKATHON_DEADLINE` near the top of the script in `public/index.html`.

## How it works

- `server.py` serves `public/` and a small JSON API, storing everything in SQLite.
- Employees sign in with name, department and work email; the session lasts 90 days.
- Each employee can give **one reaction per idea**. Picking another emoji switches it, and clicking the same one removes it.
  The database enforces this with a primary key on `(idea_id, user_id)`.
- Authors can delete their own ideas.
- The feed refreshes every 15 seconds, so everyone sees new ideas and reactions.

Back up the app by copying the `data/` folder.

## Limits to know about

Sign-in checks the email format and domain but does not verify the email, so someone could sign in with a
colleague's address. For wider use, put the app behind the company's SSO or add an emailed sign-in code.
