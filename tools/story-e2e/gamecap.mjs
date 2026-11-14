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
page.on("console", (m) => { const t = m.text(); if (t.includes("[nav-go]")) console.log("PAGE:", t); });
page.on("pageerror", (e) => console.log("PAGE-ERROR:", String(e).slice(0, 200)));
const clickText = async (text) => {
  await page.waitForFunction((t) => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === t && el.offsetParent !== null), { timeout: 8000 }, text);
  await page.evaluate((t) => {
    [...document.querySelectorAll("div,span,button")].find((el) => el.textContent?.trim() === t && el.offsetParent !== null)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, text);
};
try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
  if (signIn) await clickText("SIGN IN");
  console.log("typing credentials");
  await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 6 });
  await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 6 });
  await clickText("ENTER CLASS");
  console.log("login submitted");
  await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 45000 });
  // enroll: start → menu at 8x
  await page.evaluate(() => { (window).__navScale = 8; });
  await clickText("ENTER");
  const beats = [300, 700, 1100, 1500, 2100, 2600];
  let prev = 0;
  for (const t of beats) { await sleep(t - prev); prev = t; await shot(`g2-enroll-${t}`); }
  await page.waitForFunction(() => location.pathname === "/menu", { timeout: 10000 });
  // default: menu → campaign at 8x
  await sleep(800);
  await page.evaluate(() => { (window).__navScale = 8; });
  clickText("CAMPAIGN");
  prev = 0;
  for (const t of [500, 1100, 1800, 2400, 3200, 3800, 4400, 5200, 6000]) { await sleep(t - prev); prev = t; await shot(`g2-campaign-${t}`); }
  await page.waitForFunction(() => location.pathname === "/campaign", { timeout: 15000 });
  await sleep(400);
  await shot("g2-campaign-done");
  // battle: campaign → story (curtain) then story → duel (battle) via SKIP
  await sleep(900);
  await page.evaluate(() => { (window).__navScale = 8; [...document.querySelectorAll('[class*="dWrap"]')][0].dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await sleep(1500);
  await page.evaluate(() => { [...document.querySelectorAll('[class*="dChallengePress"]')][0].dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  prev = 0;
  for (const t of [600, 1400, 2200, 3000, 4200, 5000, 6000, 7200]) { await sleep(t - prev); prev = t; await shot(`g2-curtain-${t}`); }
  await page.waitForFunction(() => location.pathname === "/story", { timeout: 20000 });
  await page.waitForSelector('[data-testid="story-skip"]', { timeout: 60000 });
  await page.evaluate(() => { (window).__navScale = 8; });
  page.click('[data-testid="story-skip"]');
  prev = 0;
  for (const t of [700, 1600, 2600, 3600, 4600, 5600, 7000, 8500]) { await sleep(t - prev); prev = t; await shot(`g2-battle-${t}`); }
  await page.waitForFunction(() => location.pathname === "/duel", { timeout: 20000 });
  await shot("g2-battle-done");
  console.log("OK game captures");
} catch (e) {
  await shot("g2-FAIL");
  console.error("FAILED:", String(e).slice(0, 400));
  process.exitCode = 1;
} finally { await browser.close(); }
