import puppeteer from "puppeteer-core";
import path from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
  if (signIn) await clickText("SIGN IN");
  await page.waitForSelector('input[placeholder="_______________"]', { timeout: 8000 });
  await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 8 });
  await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 8 });
  await clickText("ENTER CLASS");
  await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 30000 });
  await page.goto(`${BASE}/story?encounter=${crypto.randomUUID()}`, { waitUntil: "networkidle2" });
  await page.waitForSelector('[data-testid="story-skip"]', { timeout: 60000 });
  await page.click('[data-testid="story-skip"]');
  await page.waitForSelector('[class*="roundNum"]', { timeout: 45000 });
  await sleep(2500);
  const info = await page.evaluate(() => {
    const el = document.querySelector('[class*="roundNum"]');
    const marker = el?.parentElement;
    return { text: el?.textContent, html: marker?.innerHTML, width: el?.getBoundingClientRect()?.width };
  });
  log("ROUND CHIP:", JSON.stringify(info, null, 1));
  await page.screenshot({ path: "C:/Users/EDRICK/Desktop/pacify/gui-test-screenshots/chip-after.png" });
} catch (e) {
  console.error("FAILED:", String(e).slice(0, 300));
  process.exitCode = 1;
} finally { await browser.close(); }
