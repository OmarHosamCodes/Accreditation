import "./load-env.ts";
import { auth, isAuthEnabled } from "./auth.ts";
import { seedAdminUser } from "./auth/seed.ts";
import { config } from "./config.ts";
import { emptyCorsResponse, jsonPublic, json } from "./http/responses.ts";
import { serveStatic } from "./http/static.ts";
import * as adminRoutes from "./routes/admin.ts";
import * as adminApplications from "./routes/admin/applications.ts";
import * as adminAudits from "./routes/admin/audits.ts";
import * as adminBrands from "./routes/admin/brands.ts";
import * as adminEvidence from "./routes/admin/evidence.ts";
import * as adminUsers from "./routes/admin/users.ts";
import { badgeSvg } from "./routes/badges.ts";
import * as extensionRoutes from "./routes/extension.ts";
import * as publicRoutes from "./routes/public.ts";
import { createStore } from "./store/index.ts";

const store = await createStore(config.databaseUrl);

if (isAuthEnabled()) {
  await seedAdminUser();
}

const server = Bun.serve({
  port: config.port,
  development: !config.isProduction,
  routes: {
    "/healthz": {
      GET: () => jsonPublic({ ok: true }),
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
    "/api/admin/state": {
      POST: (req) => adminRoutes.saveAdminState(req, store),
    },
    "/api/admin/reset": {
      POST: (req) => adminRoutes.resetAdminState(req, store),
    },
    "/api/admin/brands": {
      GET: (req) => adminBrands.listBrands(req, store),
      POST: (req) => adminBrands.createBrand(req, store),
    },
    "/api/admin/brands/:id": {
      PATCH: (req) => adminBrands.updateBrand(req, store, Number(req.params.id)),
      DELETE: (req) => adminBrands.deleteBrand(req, store, Number(req.params.id)),
    },
    "/api/admin/applications": {
      GET: (req) => adminApplications.listApplications(req, store),
    },
    "/api/admin/applications/:id": {
      GET: (req) => adminApplications.getApplication(req, store, Number(req.params.id)),
      PATCH: (req) => adminApplications.updateApplication(req, store, Number(req.params.id)),
      DELETE: (req) => adminApplications.deleteApplication(req, store, Number(req.params.id)),
    },
    "/api/admin/applications/:id/claim": {
      POST: (req) => adminApplications.claimApplication(req, store, Number(req.params.id)),
    },
    "/api/admin/applications/:id/reject": {
      POST: (req) => adminApplications.rejectApplication(req, store, Number(req.params.id)),
    },
    "/api/admin/audits": {
      GET: (req) => adminAudits.listAudits(req, store),
      POST: (req) => adminAudits.createAudit(req, store),
    },
    "/api/admin/audits/draft": {
      POST: (req) => adminAudits.saveAuditDraft(req, store),
    },
    "/api/admin/audits/:id": {
      GET: (req) => adminAudits.getAudit(req, store, Number(req.params.id)),
      PATCH: (req) => adminAudits.updateAudit(req, store, Number(req.params.id)),
      DELETE: (req) => adminAudits.deleteAudit(req, store, Number(req.params.id)),
    },
    "/api/admin/audits/:id/publish": {
      POST: (req) => adminAudits.publishAuditRoute(req, store, Number(req.params.id)),
    },
    "/api/admin/audits/:id/scores": {
      PUT: (req) => adminAudits.bulkSaveScores(req, store, Number(req.params.id)),
    },
    "/api/admin/audits/:id/scores/:dimId": {
      PUT: (req) => adminAudits.upsertScore(req, store, Number(req.params.id), Number(req.params.dimId)),
      DELETE: (req) => adminAudits.removeScore(req, store, Number(req.params.id), Number(req.params.dimId)),
    },
    "/api/admin/evidence": {
      GET: (req) => adminEvidence.listEvidence(req, store),
    },
    "/api/admin/audits/:id/evidence": {
      POST: (req) => adminEvidence.createEvidence(req, store, Number(req.params.id)),
    },
    "/api/admin/evidence/:id": {
      PATCH: (req) => adminEvidence.updateEvidence(req, store, Number(req.params.id)),
      DELETE: (req) => adminEvidence.deleteEvidence(req, store, Number(req.params.id)),
    },
    "/api/admin/users": {
      GET: (req) => adminUsers.listUsers(req, store),
      POST: (req) => adminUsers.createUser(req, store),
    },
    "/api/admin/users/:id": {
      DELETE: (req) => adminUsers.deleteUser(req, store, req.params.id),
    },
    "/api/extension/token": {
      POST: (req) => extensionRoutes.extensionMintToken(req),
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
    if (request.method === "OPTIONS") return emptyCorsResponse(request);

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth") && isAuthEnabled()) {
      return auth.handler(request);
    }

    const staticResponse = await serveStatic(request);
    if (staticResponse) return staticResponse;
    return json({ ok: false, errors: ["Not found"] }, request, { status: 404 });
  },
  error(err) {
    console.error(err);
    return jsonPublic({ ok: false, errors: ["Internal server error"] }, { status: 500 });
  },
});

console.log(`Accreditation server listening on ${server.url}`);
if (!isAuthEnabled()) {
  console.warn("Better Auth is disabled without DATABASE_URL. Admin and extension routes require auth.");
  console.warn("For local dev: run `bun run dev:db`, set DATABASE_URL in .env, then `bun --filter @accreditation/server auth:migrate`.");
}

export { server, store };
