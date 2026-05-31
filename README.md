# Accreditation

Bun server for the Accreditation artifact in `artifact/index.html`.

## Local Development

```bash
bun install
bun run dev
```

Open `http://localhost:3000`.

If `DATABASE_URL` is not set, the server uses in-memory state for local testing. Set `DATABASE_URL` to a Postgres connection string to use persistent shared data locally.

## Environment

```bash
DATABASE_URL=postgres://...
ADMIN_USERNAME=roaster
ADMIN_PASSWORD=change-me
PORT=3000
```

`DATABASE_URL` is supplied by Railway Postgres in production.

## Railway

```bash
railway login
railway init
railway add
railway variables --set ADMIN_USERNAME=roaster
railway variables --set ADMIN_PASSWORD=<secure-password>
railway up
```

After deploy, generate or open the Railway public domain from the Railway dashboard.
