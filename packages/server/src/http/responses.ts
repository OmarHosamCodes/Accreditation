import { config } from "../config.ts";

const ALLOWED_ORIGINS = new Set(config.trustedOrigins.filter((origin) => !origin.includes("*")));

function requestOrigin(request: Request): string | null {
  return request.headers.get("origin");
}

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (!config.isProduction && origin.startsWith("chrome-extension://")) return true;
  return false;
}

function corsHeaders(request: Request, credentials: boolean): Record<string, string> {
  const origin = requestOrigin(request);
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "cache-control": "no-store",
  };
  if (credentials && isAllowedOrigin(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
  } else {
    headers["access-control-allow-origin"] = "*";
  }
  return headers;
}

/** Public API responses (no credentials). */
export function jsonPublic(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });
}

/** Protected / credentialed API responses. */
export function json(data: unknown, request: Request, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders(request, true),
      ...(init.headers || {}),
    },
  });
}

export function emptyCorsResponse(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, true),
  });
}

export async function parseJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
