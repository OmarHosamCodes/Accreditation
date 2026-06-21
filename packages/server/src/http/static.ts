import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const WEB_DIST = resolve(import.meta.dir, "../../../web/dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".map": "application/json",
  ".zip": "application/zip",
};

function contentType(filePath: string) {
  return MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export async function serveStatic(request: Request): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/api") || pathname === "/healthz" || pathname.startsWith("/badge-")) {
    return null;
  }

  if (!existsSync(WEB_DIST)) {
    return new Response("Web build not found. Run: bun --filter @accreditation/web build", { status: 503 });
  }

  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  let filePath = join(WEB_DIST, relative);

  if (!existsSync(filePath)) {
    const hasExtension = extname(pathname) !== "";
    if (hasExtension) return null;
    filePath = join(WEB_DIST, "index.html");
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;

  return new Response(request.method === "HEAD" ? null : file, {
    headers: { "content-type": contentType(filePath) },
  });
}
