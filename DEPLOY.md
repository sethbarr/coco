# Deploying Coco to Railway

One Railway project, two services: the **app** (Express serves the API, WebSockets, and the built React frontend from one origin) and **Postgres**.

## Steps

1. **Push to GitHub** — `git push origin feature/multiuser` (or merge to `main` first).
2. **Railway → New Project → Deploy from GitHub repo** — pick `sethbarr/coco`. The `railway.json` at the repo root tells Railway how to build (install both packages, generate the Prisma client, build the React app) and start (`prisma migrate deploy`, then the server).
3. **Add Postgres** — in the project: New → Database → PostgreSQL.
4. **Set app service variables** (app service → Variables):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the Postgres service) |
   | `DIRECT_URL` | `${{Postgres.DATABASE_URL}}` |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | generate fresh: `openssl rand -hex 32` — do **not** reuse the dev value |
   | `ANTHROPIC_API_KEY` | a **new** key from console.anthropic.com (rotate; the dev key has lived in synced files) |
   | `CORS_ORIGIN` | your Railway app URL, e.g. `https://coco-production.up.railway.app` |

5. **Generate a domain** — app service → Settings → Networking → Generate Domain.
6. **Redeploy** if the first build ran before the variables were set.

## Verify

- `https://<your-app>.up.railway.app/api/health` returns `{"status":"ok"}`
- Sign up two accounts (use two browsers), connect them, run a topic end to end.

## Notes

- Migrations run automatically on every deploy (`prisma migrate deploy`).
- Local dev is unchanged: backend on :3001, CRA dev server on :3000.
- Costs: hobby plan ~$5/mo covers this comfortably at prototype scale.
- Backups: Railway Postgres has snapshots on paid plans — enable before real users.
- Before sharing beyond trusted testers, see PROJECT_BRIEF.md → Stumbling blocks
  (plaintext message storage, no crisis handling).
