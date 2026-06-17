# Accreditation

Bun 1.3.x workspace monorepo for the Accreditation platform: API server, React web UI, browser extension, and shared domain logic.

## Project layout

```
packages/
  shared/     Types, tiers, scoring, seed data
  server/     Bun.serve API + static SPA hosting
  web/        Vite + React + shadcn/ui frontend
  extension/  Chrome MV3 audit toolbar
```

## Local development

```bash
bun install
bun run dev
```

This starts:

- **Vite** on `http://localhost:5173` (web UI with HMR; proxies `/api` and `/badge-*` to the server)
- **Bun API** on `http://localhost:3000`

Open `http://localhost:5173` for the app during development.

To run only one side:

```bash
bun run dev:web     # Vite only
bun run dev:server  # API only
```

If `DATABASE_URL` is not set, the server uses in-memory state for local testing. Copy `.env.example` to `.env` and set `DATABASE_URL` for persistent Postgres storage.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite + API server |
| `bun run start` | Start production server (serves built web from `packages/web/dist`) |
| `bun run build` | Build web (`vite build`) then bundle server |
| `bun run test` | Run tests across packages |
| `bun run typecheck` | Type-check shared, server, and web modules |
| `bun run check` | `typecheck` + `build` (CI validation) |

## Environment

```bash
DATABASE_URL=postgres://...
ADMIN_USERNAME=roaster
ADMIN_PASSWORD=change-me
PORT=3000
NODE_ENV=development
```

`DATABASE_URL` is supplied by Railway Postgres in production.

## Browser extension toolbar

The unpacked Chrome/Edge extension lives in `packages/extension/`.

1. Start the API with `bun run dev:server` (or `bun run dev`).
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose "Load unpacked" and select the `packages/extension/` folder.
5. Open the extension popup, set the API base URL, username, and password.
6. Visit an Instagram or Facebook brand page and use the injected toolbar to start an audit, score metrics, add evidence pins, and publish to the leaderboard.

Default local settings:

```bash
API base URL=http://localhost:3000
Username=roaster
Password=change-me
```

For production, add the deployed API origin to `packages/extension/manifest.json` under `host_permissions`, then reload the unpacked extension.

## Railway

`railway.json` runs:

- Build: `bun install --frozen-lockfile && bun run check`
- Start: `bun run start`
- Health check: `/healthz`

### Deploy or update production

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

### Use the extension against Railway

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this repo's `packages/extension/` folder.
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
