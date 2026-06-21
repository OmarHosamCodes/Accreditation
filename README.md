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
BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:3000
ADMIN_EMAIL=roaster@accreditation.io
ADMIN_PASSWORD=change-me
EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID
VITE_EXTENSION_ID=YOUR_EXTENSION_ID
PORT=3000
NODE_ENV=development
```

`DATABASE_URL` is supplied by Railway Postgres in production. For local development:

```bash
bun run dev:db   # starts Postgres via Docker
bun --filter @accreditation/server auth:migrate
bun run dev
```

If your `.env` uses Railway's private `railway.internal` hostname, the server automatically falls back to `postgres://postgres:postgres@localhost:5432/accreditation` in development. Override with `LOCAL_DATABASE_URL` if needed.

## Browser extension toolbar

The unpacked Chrome/Edge extension lives in `packages/extension/`.

1. Start the app with `bun run dev` (Vite on `:5173` + API on `:3000`).
2. Open `chrome://extensions`, enable Developer mode, and load unpacked `packages/extension/`.
3. Copy the extension ID from `chrome://extensions` into `.env` as `EXTENSION_ORIGIN=chrome-extension://…` and `VITE_EXTENSION_ID=…`, then restart the dev servers.
4. Open the extension popup, confirm API base URL (`http://localhost:3000`) and website base URL (`http://localhost:5173`).
5. Click **Sign in on website**, sign in with the seeded admin email/password, and wait for “Extension connected”.
6. Visit an Instagram or Facebook brand page and use the injected toolbar to audit, score metrics, add evidence, and publish.

Default local settings:

```bash
API base URL=http://localhost:3000
Website base URL=http://localhost:5173
Admin email=roaster@accreditation.io
Admin password=change-me
```

For production, set both base URLs to your deployed origin and add that origin to `packages/extension/manifest.json` under `host_permissions` and `externally_connectable`, then reload the extension.

### Android (Edge Canary)

Chrome for Android does not load extensions. Use **Microsoft Edge Canary** and sideload the same MV3 package. See [docs/android-extension-setup.md](docs/android-extension-setup.md) for install, auth, and mobile URL notes.

Pack a zip for transfer:

```bash
bun --filter @accreditation/extension pack
```

The Android extension ID may differ from desktop. Set `EXTENSION_ORIGIN` and `VITE_EXTENSION_ID` to the ID shown in Edge Canary after sideloading.

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
railway variables --set BETTER_AUTH_SECRET=<secret> BETTER_AUTH_URL=https://your-service.up.railway.app ADMIN_EMAIL=roaster@accreditation.io ADMIN_PASSWORD=<secure-password> EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID
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

1. Open `chrome://extensions`, enable Developer mode, and load unpacked `packages/extension/`.
2. Set `EXTENSION_ORIGIN` on the server to your extension ID and rebuild/redeploy if needed.
3. Open the extension popup and set:

```bash
API base URL=https://your-service.up.railway.app
Website base URL=https://your-service.up.railway.app
```

4. Click **Sign in on website**, sign in with your admin email/password, and wait for the connect confirmation.
5. Open an Instagram or Facebook brand page, click **Start audit**, score metrics, pin evidence, and **Publish**.

The extension manifest already allows Railway domains:

```json
"https://*.railway.app/*",
"https://*.up.railway.app/*"
```
