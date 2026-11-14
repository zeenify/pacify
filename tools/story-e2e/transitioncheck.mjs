import puppeteer from "puppeteer-core";
import path from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const SHOTS = "C:\\Users\\EDRICK\\Desktop\\pacify\\gui-test-screenshots";
const log = (...a) => console.log(...a);
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
const burst = async (prefix, total, step) => {
  for (let i = 0; i < total; i++) { await shot(`${prefix}-${i}`); await sleep(step); }
};
try {
  // sign in so story/duel variants are reachable
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
  if (signIn) await clickText("SIGN IN");
  await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 8 });
  await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 8 });
  await clickText("ENTER CLASS");
  await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 30000 });
  // slow-motion hook: 3x beats so the screenshot burst catches every phase
  await page.evaluate(() => { (window).__navSlow = true; });
  // default forward: menu → campaign
  await page.goto(`${BASE}/menu`, { waitUntil: "networkidle2" });
  await sleep(1500);
  await page.evaluate(() => { (window).__navSlow = true; });
  clickText("CAMPAIGN");
  await burst("t-default", 8, 150);
  await sleep(1500);
  await shot("t-default-done");

  // utility: campaign → options
  await sleep(600);
  await page.goto(`${BASE}/campaign`, { waitUntil: "networkidle2" });
  await sleep(1200);
  // campaign has no options button; go via menu
  await page.goto(`${BASE}/menu`, { waitUntil: "networkidle2" });
  await sleep(1200);
  await page.evaluate(() => { [...document.querySelectorAll('[class*="jRow"]')].find((el) => el.textContent?.includes("OPTIONS"))?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await burst("t-utility", 4, 100);

  // battle: need a story screen → SKIP → duel. Fresh encounter via story URL.
  await page.goto(`${BASE}/story?encounter=${crypto.randomUUID()}`, { waitUntil: "networkidle2" });
  await page.evaluate(() => { (window).__navSlow = true; });
  await page.waitForSelector('[data-testid="story-skip"]', { timeout: 60000 });
  await sleep(600);
  page.click('[data-testid="story-skip"]');
  await burst("t-battle", 12, 160);
  await sleep(800);
  await shot("t-battle-done");
  log("duel reached:", await page.evaluate(() => location.pathname));

  // back mirror: duel → campaign (result-less exit uses replace to campaign only after result; force via campaign button)
  await sleep(500);
  // duel screen has MENU button? use demo exit — simply navigate back via menu click if present; else reload menu
  await page.goto(`${BASE}/menu`, { waitUntil: "networkidle2" });
  await sleep(1200);
  await page.evaluate(() => { [...document.querySelectorAll('[class*="jRow"]')].find((el) => el.textContent?.includes("DOSSIER"))?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await burst("t-forward-dossier", 4, 100);
  await sleep(600);
  // dossier back → menu (back button on dossier)
  const backBtn = await page.evaluate(() => [...document.querySelectorAll("div,span")].find((el) => /BACK|MENU/.test(el.textContent?.trim() ?? "") && el.offsetParent !== null)?.textContent?.trim() ?? null);
  log("dossier back control:", backBtn);
  if (backBtn) {
    await page.evaluate((t) => { [...document.querySelectorAll("div,span")].find((el) => el.textContent?.trim() === t && el.offsetParent !== null)?.dispatchEvent(new MouseEvent("click", { bubbles: true })); }, backBtn);
    await burst("t-back", 5, 80);
  }
  console.log("OK transitions");
} catch (e) {
  await shot("t-FAIL");
  console.error("FAILED:", String(e).slice(0, 400));
  process.exitCode = 1;
} finally { await browser.close(); }
