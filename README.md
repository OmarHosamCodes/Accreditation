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

`railway.json` runs:

- Build: `bun install --frozen-lockfile && bun run check`
- Start: `bun run start`
- Health check: `/healthz`

### Deploy or Update Production

```bash
railway login
railway link
railway add --database postgres
railway variables --set ADMIN_USERNAME=roaster ADMIN_PASSWORD=<secure-password>
railway up
```

If this is a brand-new Railway project, use `railway init` instead of `railway link`.

After deploy:

1. Open the Railway dashboard.
2. Open the web service.
3. Go to Settings > Networking.
4. Generate or copy the public domain.
5. Confirm the app is healthy by opening:

```bash
https://your-service.up.railway.app/healthz
```

It should return:

```json
{"ok":true}
```

### Use the Extension Against Railway

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this repo's `extension/` folder.
5. Open the extension popup.
6. Set:

```bash
API base URL=https://your-service.up.railway.app
Username=roaster
Password=<secure-password>
```

7. Open an Instagram or Facebook brand page.
8. Click `Start audit`.
9. Score any metrics you want.
10. Use `Pin` to attach evidence to page elements.
11. Click `Publish`; unfinished audits can publish, and missing metrics score as `0`.
12. Use the `Copy link` button after publish to share the public audit URL.

The extension manifest already allows Railway domains:

```json
"https://*.railway.app/*",
"https://*.up.railway.app/*"
```
