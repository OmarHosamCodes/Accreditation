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

## Browser Extension Toolbar

The unpacked Chrome/Edge extension lives in `extension/`.

1. Start the API with `bun run dev`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose "Load unpacked" and select the `extension/` folder.
5. Open the extension popup, set the API base URL, username, and password.
6. Visit an Instagram or Facebook brand page and use the injected toolbar to start an audit, score metrics, add evidence pins, and publish to the leaderboard.

Default local settings:

```bash
API base URL=http://localhost:3000
Username=roaster
Password=change-me
```

For production, add the deployed API origin to `extension/manifest.json` under `host_permissions`, then reload the unpacked extension.

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
