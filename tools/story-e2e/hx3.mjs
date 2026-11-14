import puppeteer from "puppeteer-core";
import path from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const SHOTS = "C:\\Users\\EDRICK\\Desktop\\pacify\\gui-test-screenshots";
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: path.join(SHOTS, `${n}.png`) }); log("shot:", n); };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900", "--mute-audio"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
const clickText = async (text) => {
  await page.waitForFunction((t) => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === t && el.offsetParent !== null), { timeout: 8000 }, text);
  await page.evaluate((t) => {
    [...document.querySelectorAll("div,span,button")].find((el) => el.textContent?.trim() === t && el.offsetParent !== null)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, text);
};
try {
  log("signing in as story_hx_mwfyroz7 (two finished duels in history)");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
  if (signIn) await clickText("SIGN IN");
  await page.waitForSelector('input[placeholder="_______________"]', { timeout: 8000 });
  await page.focus('input[placeholder="_______________"]');
  await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 10 });
  await page.focus('input[placeholder="min. 6 characters"]');
  await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 10 });
  await clickText("ENTER CLASS");
  await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 30000 });
  await page.goto(`${BASE}/story?encounter=${crypto.randomUUID()}`, { waitUntil: "networkidle2" });
  const t0 = Date.now();
  await page.waitForSelector('[data-testid="story-text"]', { timeout: 60000 });
  log(`scene ready in ${Date.now() - t0}ms`);
  for (let i = 0; i < 10; i++) {
    await sleep(1200);
    if ((await page.$$('[data-testid^="reply-"]')).length) { log("reply choices present"); await shot("h-e3-choices"); break; }
    if ((await page.evaluate(() => location.pathname)) !== "/story") break;
    const line = await page.$eval('[data-testid="story-text"]', (el) => el.textContent);
    log(`third prelude ${i + 1}:`, line);
    await shot(`h-e3-pre${i + 1}`);
    await page.click('[data-testid="story-advance"]');
    await sleep(300);
    await page.click('[data-testid="story-advance"]').catch(() => {});
  }
  console.log("OK hx3");
} catch (e) {
  await shot("h-FAIL3").catch(() => {});
  console.error("FAILED:", String(e).slice(0, 400));
  process.exitCode = 1;
} finally { await browser.close(); }
