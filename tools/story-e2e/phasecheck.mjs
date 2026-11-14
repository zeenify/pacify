import puppeteer from "puppeteer-core";
import path from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const SHOTS = "C:\\Users\\EDRICK\\Desktop\\pacify\\gui-test-screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: path.join(SHOTS, `${n}.png`) }); };
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
const waitPhase = async (cls, timeout = 12000) => {
  await page.waitForFunction((c) => document.querySelector(".navt")?.className.includes(c), { timeout }, cls);
};
try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
  if (signIn) await clickText("SIGN IN");
  await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 8 });
  await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 8 });
  await clickText("ENTER CLASS");
  await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 30000 });
  await page.goto(`${BASE}/menu`, { waitUntil: "networkidle2" });
  await sleep(1200);

  // forward, blade beat: shoot early in reveal (blade draws for 80ms)
  await page.evaluate(() => { (window).__navSlow = true; });
  clickText("CAMPAIGN");
  await waitPhase("reveal");
  await sleep(30);
  await shot("p-default-blade");
  await sleep(450);
  await shot("p-default-split");
  await sleep(1800);

  // battle stamp frame: story → duel via skip
  await page.goto(`${BASE}/story?encounter=${crypto.randomUUID()}`, { waitUntil: "networkidle2" });
  await page.evaluate(() => { (window).__navSlow = true; });
  await page.waitForSelector('[data-testid="story-skip"]', { timeout: 60000 });
  page.click('[data-testid="story-skip"]');
  await waitPhase("reveal");
  await sleep(120);
  await shot("p-battle-stamp");
  await sleep(300);
  await shot("p-battle-split");
  await sleep(2400);

  // back mirror: duel → campaign via MENU? duel has no exit pre-result; use dossier flow
  await page.goto(`${BASE}/dossier`, { waitUntil: "networkidle2" });
  await sleep(1200);
  await page.evaluate(() => { (window).__navSlow = true; });
  await page.evaluate(() => { history; [...document.querySelectorAll("div,span")].find((el) => el.textContent?.trim() === "MENU")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await waitPhase("reveal");
  await sleep(120);
  await shot("p-back-carry");
  console.log("OK phases");
} catch (e) {
  await shot("p-FAIL");
  console.error("FAILED:", String(e).slice(0, 300));
  process.exitCode = 1;
} finally { await browser.close(); }
