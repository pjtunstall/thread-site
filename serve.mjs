#!/usr/bin/env node
/**
 * Static file server with SPA fallback for app routes (e.g. /downloads).
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(PROJECT_ROOT, "frontend");
const PORT = Number(process.env.PORT) || 8000;
const SPA_PATHS = new Set(["/downloads", "/downloads/"]);

const MIME = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

/**
 * @param {string} filePath
 */
function resolveSafePath(filePath) {
  const resolved = path.resolve(ROOT, filePath);
  if (!resolved.startsWith(ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
async function handleRequest(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost`);
  let pathname = url.pathname;

  if (SPA_PATHS.has(pathname)) {
    pathname = "/index.html";
  }

  let filePath = resolveSafePath(pathname.slice(1) || "index.html");
  if (!filePath) {
    res.writeHead(403);
    res.end();
    return;
  }

  try {
    await stat(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": type });
    if (req.method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(handleRequest);
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other server (e.g. an old \`npm run dev\` or \`python3 -m http.server\`) or run PORT=${PORT + 1} npm run dev`,
    );
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, () => {
  console.log(`Serving on http://localhost:${PORT}/`);
});
