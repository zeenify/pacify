/* Minimal static file server rooted at the repo root, so capture pages can
   import "/node_modules/three/build/three.module.js" over HTTP.
   file:// URLs break ES module imports in Chrome, hence the server. */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".glb": "model/gltf-binary",
  ".map": "application/json; charset=utf-8",
};

export function startServer({ root, port = 0 } = {}) {
  const base = resolve(root ?? process.cwd());

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";

      // Resolve inside the root only — block traversal.
      const target = resolve(join(base, normalize(sep + pathname)));
      if (target !== base && !target.startsWith(base + sep)) {
        res.writeHead(403).end("forbidden");
        return;
      }

      const body = await readFile(target);
      const type = MIME[extname(target).toLowerCase()] ?? "application/octet-stream";
      res.writeHead(200, {
        "content-type": type,
        "cache-control": "no-store",
        "content-length": body.length,
      });
      res.end(body);
    } catch (err) {
      if (err?.code === "ENOENT" || err?.code === "EISDIR") {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(500).end(String(err?.stack ?? err));
    }
  });

  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => {
      const { port: actual } = server.address();
      ok({
        url: `http://127.0.0.1:${actual}`,
        port: actual,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
