import { config } from "./config.ts";
import { emptyCorsResponse, json } from "./http/responses.ts";
import { serveStatic } from "./http/static.ts";
import * as adminRoutes from "./routes/admin.ts";
import { badgeSvg } from "./routes/badges.ts";
import * as extensionRoutes from "./routes/extension.ts";
import * as publicRoutes from "./routes/public.ts";
import { createStore } from "./store/index.ts";

const store = await createStore(config.databaseUrl);

const server = Bun.serve({
  port: config.port,
  development: !config.isProduction,
  routes: {
    "/healthz": {
      GET: () => json({ ok: true }),
    },
    "/api/state": {
      GET: () => publicRoutes.getState(store),
    },
    "/api/applications": {
      POST: (req) => publicRoutes.createApplication(req, store),
    },
    "/api/reaudits": {
      POST: (req) => publicRoutes.createReaudit(req, store),
    },
    "/api/admin/login": {
      POST: (req) => adminRoutes.adminLogin(req),
    },
    "/api/admin/state": {
      POST: (req) => adminRoutes.saveAdminState(req, store),
    },
    "/api/admin/reset": {
      POST: (req) => adminRoutes.resetAdminState(req, store),
    },
    "/api/extension/login": {
      POST: (req) => extensionRoutes.extensionLogin(req, store),
    },
    "/api/extension/bootstrap": {
      GET: (req) => extensionRoutes.extensionBootstrapRoute(req, store),
    },
    "/api/extension/brands/resolve": {
      POST: (req) => extensionRoutes.extensionResolveBrand(req, store),
    },
    "/api/extension/audits": {
      POST: (req) => extensionRoutes.extensionCreateAudit(req, store),
    },
    "/api/extension/audits/:id": {
      GET: (req) => extensionRoutes.extensionGetAudit(req, store, Number(req.params.id)),
    },
    "/api/extension/audits/:id/scores/:dimId": {
      PUT: (req) => extensionRoutes.extensionSaveScore(req, store, Number(req.params.id), Number(req.params.dimId)),
    },
    "/api/extension/audits/:id/evidence": {
      POST: (req) => extensionRoutes.extensionCreateEvidence(req, store, Number(req.params.id)),
      GET: (req) => extensionRoutes.extensionListEvidence(req, store, Number(req.params.id)),
    },
    "/api/extension/audits/:id/evidence/:evidenceId": {
      DELETE: (req) => extensionRoutes.extensionDeleteEvidence(req, store, Number(req.params.id), Number(req.params.evidenceId)),
    },
    "/api/extension/audits/:id/submit": {
      POST: (req) => extensionRoutes.extensionSubmitAudit(req, store, Number(req.params.id)),
    },
    "/badge-:id.svg": {
      GET: (req) => badgeSvg(store, Number(req.params["id.svg"])),
    },
  },
  async fetch(request) {
    if (request.method === "OPTIONS") return emptyCorsResponse();
    const staticResponse = await serveStatic(request);
    if (staticResponse) return staticResponse;
    return json({ ok: false, errors: ["Not found"] }, { status: 404 });
  },
  error(err) {
    console.error(err);
    return json({ ok: false, errors: ["Internal server error"] }, { status: 500 });
  },
});

console.log(`Accreditation server listening on ${server.url}`);

export { server, store };
