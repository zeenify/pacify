/* Smoke test runner: proves the pipeline end to end and measures throughput
   before we commit to authoring 2:40 of content.

   Checks, in order:
     1. determinism — seek(n) twice must produce an identical canvas checksum
     2. capture     — GPU renderer, then swiftshader only if GPU fails
     3. non-black   — a fully black 1080p PNG compresses to a few KB; catch that
     4. encode      — PNG sequence -> H.264 via ffmpeg-static

   Run: node tools/motion/smoke.mjs
*/

import { statSync, readdirSync, existsSync } from "node:fs";
import { rm, mkdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

import { startServer } from "./serve.mjs";
import { capture, findChrome } from "./capture.mjs";
import { encodeVideo } from "./encode.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const OUT = join(HERE, ".smoke");

const FRAMES = 90;

async function determinismCheck(url) {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--mute-audio"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    const errs = [];
    const badResources = [];
    page.on("pageerror", (e) => errs.push(String(e?.message ?? e)));
    page.on("console", (m) => {
      // Resource load failures are reported precisely via the response event below;
      // skip the generic console duplicate so only real JS errors stay fatal.
      if (m.type() === "error" && !/Failed to load resource/i.test(m.text())) {
        errs.push(`console: ${m.text()}`);
      }
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && !/favicon/i.test(r.url())) badResources.push(`${r.status()} ${r.url()}`);
    });

    await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
    await page.waitForFunction("window.__MOTION__ && window.__MOTION__.meta", { timeout: 60_000 });
    await page.evaluate(() => window.__MOTION__.ready);

    const info = await page.evaluate(() => window.__MOTION__.info);
    const a = await page.evaluate((n) => { window.__MOTION__.seek(n); return window.__MOTION__.checksum(); }, 45);
    await page.evaluate((n) => window.__MOTION__.seek(n), 10);
    const b = await page.evaluate((n) => { window.__MOTION__.seek(n); return window.__MOTION__.checksum(); }, 45);
    // A different frame must differ, otherwise seek() is not actually driving anything.
    const c = await page.evaluate((n) => { window.__MOTION__.seek(n); return window.__MOTION__.checksum(); }, 46);

    return { info, errs, badResources, same: a === b, differs: a !== c, checksums: { a, b, c } };
  } finally {
    await browser.close();
  }
}

function frameStats(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
  const sizes = files.map((f) => statSync(join(dir, f)).size);
  sizes.sort((x, y) => x - y);
  return {
    count: files.length,
    minKB: +(sizes[0] / 1024).toFixed(1),
    medianKB: +(sizes[Math.floor(sizes.length / 2)] / 1024).toFixed(1),
    maxKB: +(sizes[sizes.length - 1] / 1024).toFixed(1),
  };
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const server = await startServer({ root: REPO });
  const pagePath = "/tools/motion/src/smoke.html";
  console.log(`server: ${server.url}`);

  try {
    // ---- 1. determinism ----
    console.log("\n[1/4] determinism");
    const d = await determinismCheck(`${server.url}${pagePath}`);
    if (d.errs.length) console.error("  PAGE ERRORS:\n    " + d.errs.join("\n    "));
    if (d.badResources.length) console.error("  MISSING RESOURCES:\n    " + d.badResources.join("\n    "));
    console.log(`  scene info: ${JSON.stringify(d.info)}`);
    console.log(`  seek(45) twice identical: ${d.same ? "PASS" : "FAIL"}`);
    console.log(`  seek(45) != seek(46):     ${d.differs ? "PASS" : "FAIL"}`);
    console.log(`  checksums: ${d.checksums.a} / ${d.checksums.b} / ${d.checksums.c}`);
    if (!d.same || !d.differs || d.errs.length || d.badResources.length) {
      console.error("\nSmoke test failed — aborting before benchmark.");
      process.exit(1);
    }

    // ---- 2. capture benchmark ----
    let renderer = "gpu";
    let result;
    const gpuDir = join(OUT, "gpu");
    try {
      console.log("\n[2/4] capture benchmark (gpu)");
      result = await capture({
        url: `${server.url}${pagePath}?halftone=0`,
        outDir: gpuDir,
        from: 0,
        to: FRAMES - 1,
        fps: 30,
        renderer: "gpu",
      });
    } catch (e) {
      console.warn(`  gpu capture failed: ${e.message}\n  falling back to swiftshader`);
      renderer = "swiftshader";
      result = await capture({
        url: `${server.url}${pagePath}?halftone=0`,
        outDir: join(OUT, "sw"),
        from: 0,
        to: FRAMES - 1,
        fps: 30,
        renderer: "swiftshader",
      });
    }

    // ---- 3. black-frame guard ----
    console.log("\n[3/4] frame sanity");
    const dir = join(OUT, renderer === "gpu" ? "gpu" : "sw");
    const st = frameStats(dir);
    console.log(`  ${st.count} pngs  min ${st.minKB}KB  median ${st.medianKB}KB  max ${st.maxKB}KB`);
    if (st.medianKB < 12) {
      console.error("  FAIL: median frame is suspiciously small — likely rendering black.");
      process.exit(1);
    }
    console.log("  PASS: frames carry real content");

    // ---- 4. encode ----
    console.log("\n[4/4] encode");
    const mp4 = join(OUT, "smoke.mp4");
    await encodeVideo({ framesDir: dir, out: mp4, fps: 30, crf: 18, preset: "medium" });
    const { size } = await stat(mp4);
    console.log(`  wrote ${mp4} (${(size / 1024).toFixed(0)}KB)`);

    // ---- verdict ----
    const perFrame = result.perFrame;
    const full30 = (160 * 30 * perFrame) / 1000 / 60; // 2:40 at 30fps
    const full60 = (160 * 60 * perFrame) / 1000 / 60;
    console.log("\n=== VERDICT ===");
    console.log(`renderer:        ${renderer}`);
    console.log(`per frame:       ${perFrame.toFixed(0)}ms`);
    console.log(`2:40 @30fps:     ~${full30.toFixed(1)} min  (4800 frames)`);
    console.log(`2:40 @60fps:     ~${full60.toFixed(1)} min  (9600 frames)`);
    console.log(`recommendation:  ${full60 < 45 ? "60fps is affordable" : full30 < 45 ? "use 30fps" : "use 30fps and parallelise tabs"}`);
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
