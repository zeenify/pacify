/* Frame-stepped capture harness.
   Drives Chrome to a deterministic page, calls seek(frame) once per frame, and
   screenshots the composited result (WebGL canvas + DOM overlay in register).

   Nothing here is real-time: wall-clock speed is irrelevant to output correctness,
   which is the whole point. Frames are independent, so a range can be re-rendered. */

import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

export function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  throw new Error(`No Chrome/Edge found. Looked at:\n  ${CHROME_CANDIDATES.join("\n  ")}`);
}

/** Software WebGL. Slower than a real GPU but always available and bit-stable. */
const SWIFTSHADER_ARGS = [
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
];

/** Let Chrome use the real GPU. Much faster when it works in headless. */
const GPU_ARGS = [
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
  "--use-angle=d3d11",
];

const COMMON_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-features=CalculateNativeWinOcclusion",
  "--hide-scrollbars",
  "--mute-audio",
  "--force-color-profile=srgb",
  "--font-render-hinting=none",
];

export async function capture(opts) {
  const {
    url,
    outDir,
    width = 1920,
    height = 1080,
    scale = 1,
    from = 0,
    to,
    fps = 30,
    renderer = "gpu",
    clean = false,
    quiet = false,
    timeoutMs = 120_000,
  } = opts;

  const dir = resolve(outDir);
  if (clean && existsSync(dir)) await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const executablePath = findChrome();
  const args = [...COMMON_ARGS, ...(renderer === "swiftshader" ? SWIFTSHADER_ARGS : GPU_ARGS)];

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args,
    defaultViewport: { width, height, deviceScaleFactor: scale },
  });

  const log = (...a) => {
    if (!quiet) console.log(...a);
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: scale });

    page.on("pageerror", (e) => console.error("[page error]", e?.message ?? e));
    page.on("console", (m) => {
      const t = m.type();
      if (t === "error" || t === "warning") console.error(`[console.${t}]`, m.text());
    });

    log(`renderer=${renderer} chrome=${executablePath}`);
    await page.goto(url, { waitUntil: "networkidle0", timeout: timeoutMs });

    // The page must publish window.__MOTION__ with { meta, ready, seek }.
    await page.waitForFunction("window.__MOTION__ && window.__MOTION__.meta", { timeout: timeoutMs });
    const meta = await page.evaluate(() => window.__MOTION__.meta);
    log(`scene: ${meta.totalFrames} frames @ ${meta.fps}fps (${(meta.totalFrames / meta.fps).toFixed(2)}s)`);

    if (meta.fps !== fps) log(`NOTE: harness fps=${fps} differs from scene meta.fps=${meta.fps}`);

    await page.evaluate(() => window.__MOTION__.ready);

    const lastFrame = to ?? meta.totalFrames - 1;
    const count = lastFrame - from + 1;
    log(`capturing frames ${from}..${lastFrame} (${count}) -> ${dir}`);

    const t0 = Date.now();
    for (let f = from; f <= lastFrame; f++) {
      await page.evaluate((n) => window.__MOTION__.seek(n), f);
      await page.screenshot({
        path: join(dir, `f${String(f).padStart(6, "0")}.png`),
        type: "png",
        captureBeyondViewport: false,
      });
      if (!quiet && (f - from + 1) % 50 === 0) {
        const done = f - from + 1;
        const per = (Date.now() - t0) / done;
        const eta = ((count - done) * per) / 1000;
        log(`  ${done}/${count}  ${per.toFixed(0)}ms/frame  eta ${eta.toFixed(0)}s`);
      }
    }

    const elapsed = (Date.now() - t0) / 1000;
    const perFrame = (elapsed * 1000) / count;
    log(
      `done: ${count} frames in ${elapsed.toFixed(1)}s (${perFrame.toFixed(0)}ms/frame)\n` +
        `projection: ${meta.totalFrames} frames => ${((meta.totalFrames * perFrame) / 1000 / 60).toFixed(1)} min`,
    );

    return { dir, frames: count, perFrame, meta };
  } finally {
    await browser.close();
  }
}

// ---------- CLI ----------

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

if (isMain) {
  const { values } = parseArgs({
    options: {
      url: { type: "string" },
      out: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      fps: { type: "string" },
      width: { type: "string" },
      height: { type: "string" },
      scale: { type: "string" },
      renderer: { type: "string", default: "gpu" },
      clean: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
    },
  });

  if (!values.url || !values.out) {
    console.error("usage: node capture.mjs --url <http://...> --out <dir> [--from N] [--to N] [--renderer gpu|swiftshader] [--scale 1|2] [--clean]");
    process.exit(2);
  }

  await capture({
    url: values.url,
    outDir: values.out,
    from: values.from ? Number(values.from) : 0,
    to: values.to ? Number(values.to) : undefined,
    fps: values.fps ? Number(values.fps) : 30,
    width: values.width ? Number(values.width) : 1920,
    height: values.height ? Number(values.height) : 1080,
    scale: values.scale ? Number(values.scale) : 1,
    renderer: values.renderer,
    clean: values.clean,
    quiet: values.quiet,
  });
}
