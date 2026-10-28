/* Grab specific frames as PNGs for eyeballing, without a full capture run.
   Usage: node tools/motion/still.mjs [page] [frame,frame,...] [--renderer gpu|swiftshader]
   e.g.   node tools/motion/still.mjs smoke.html 12,45,78
   Writes to tools/motion/.still/<page>/<frame>.png and prints the paths. */

import { mkdir } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

import { startServer } from "./serve.mjs";
import { findChrome } from "./capture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

const argv = process.argv.slice(2);
const rendererFlag = argv.indexOf("--renderer");
const renderer = rendererFlag >= 0 ? argv[rendererFlag + 1] : "gpu";
const positional = argv.filter((a, i) => !a.startsWith("--") && !(rendererFlag >= 0 && i === rendererFlag + 1));
const pageName = positional[0] ?? "smoke.html";
const frames = (positional[1] ?? "0,30,60").split(",").map(Number);
const query = positional[2] ?? "";

const outDir = join(HERE, ".still", basename(pageName, ".html"));
await mkdir(outDir, { recursive: true });

const server = await startServer({ root: REPO });
const url = `${server.url}/tools/motion/src/${pageName}${query}`;

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-color-profile=srgb",
    ...(renderer === "swiftshader"
      ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
      : ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"]),
  ],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e?.message ?? e));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/i.test(m.text())) console.error("[console.error]", m.text());
  });

  await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
  await page.waitForFunction("window.__MOTION__ && window.__MOTION__.meta", { timeout: 60_000 });
  await page.evaluate(() => window.__MOTION__.ready);
  const meta = await page.evaluate(() => window.__MOTION__.meta);
  console.log(`scene ${pageName}: ${meta.totalFrames} frames @ ${meta.fps}fps`);

  const written = [];
  for (const f of frames) {
    await page.evaluate((n) => window.__MOTION__.seek(n), f);
    const path = join(outDir, `f${String(f).padStart(6, "0")}.png`);
    await page.screenshot({ path, type: "png", captureBeyondViewport: false });
    written.push(path);
  }
  console.log(written.join("\n"));
} finally {
  await browser.close();
  await server.close();
}
