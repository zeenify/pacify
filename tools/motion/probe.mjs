/* Diagnostic: sample real canvas pixels + element geometry at a given frame.
   Usage: node tools/motion/probe.mjs [page] [frame]
   Prints element rects, canvas buffer size, and pixel colours at sample points. */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

import { startServer } from "./serve.mjs";
import { findChrome } from "./capture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const pageName = process.argv[2] ?? "smoke.html";
const frame = Number(process.argv[3] ?? 45);

const server = await startServer({ root: REPO });
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--mute-audio", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e?.message ?? e));
  await page.goto(`${server.url}/tools/motion/src/${pageName}`, { waitUntil: "networkidle0", timeout: 120_000 });
  await page.waitForFunction("window.__MOTION__ && window.__MOTION__.meta", { timeout: 60_000 });
  await page.evaluate(() => window.__MOTION__.ready);
  await page.evaluate((n) => window.__MOTION__.seek(n), frame);

  const report = await page.evaluate(() => {
    const rect = (id) => {
      const e = document.getElementById(id);
      if (!e) return { id, missing: true };
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { id, x: b.x, y: b.y, w: b.width, h: b.height, opacity: cs.opacity, zIndex: cs.zIndex, bg: cs.backgroundColor };
    };
    const canvas = document.getElementById("gl");
    const sample = (x, y) => {
      const t = document.createElement("canvas");
      t.width = 1;
      t.height = 1;
      const g = t.getContext("2d", { willReadFrequently: true });
      g.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      return `#${[d[0], d[1], d[2], d[3]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    };
    return {
      rects: [rect("bg"), rect("gl"), rect("dom")],
      canvasBuffer: { w: canvas.width, h: canvas.height },
      canvasCss: { w: canvas.clientWidth, h: canvas.clientHeight },
      dpr: window.devicePixelRatio,
      inner: { w: window.innerWidth, h: window.innerHeight },
      pixels: {
        topLeft: sample(60, 60),
        topRight: sample(1860, 60),
        midLeft: sample(60, 540),
        midRight: sample(1860, 540),
        seamLeft: sample(1560, 540),
        seamRight: sample(1640, 540),
        bottomLeft: sample(60, 1020),
        bottomRight: sample(1860, 1020),
      },
    };
  });

  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await server.close();
}
