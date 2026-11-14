import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: false,
  args: ["--no-first-run", "--window-size=1600,900", "--start-maximized"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
page.on("pageerror", (e) => log("PAGE-ERROR:", String(e).slice(0, 200)));
const clickText = async (text) => {
  await page.waitForFunction((t) => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === t && el.offsetParent !== null), { timeout: 8000 }, text);
  await page.evaluate((t) => {
    [...document.querySelectorAll("div,span,button")].find((el) => el.textContent?.trim() === t && el.offsetParent !== null)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, text);
};
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
if (signIn) await clickText("SIGN IN");
await page.waitForSelector('input[placeholder="_______________"]', { timeout: 8000 });
await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 8 });
await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 8 });
await clickText("ENTER CLASS");
await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 30000 });
log("at:", await page.evaluate(() => location.pathname));
await page.screenshot({ path: "C:/Users/EDRICK/Desktop/pacify/gui-test-screenshots/start-debug.png" });
await sleep(1500);
await clickText("ENTER");
for (let i = 0; i < 8; i++) {
  await sleep(400);
  log(`t+${i * 400}ms path:`, await page.evaluate(() => location.pathname), "| navt:", await page.evaluate(() => document.querySelector(".navt")?.className ?? "none"));
}
await page.screenshot({ path: "C:/Users/EDRICK/Desktop/pacify/gui-test-screenshots/start-after-enter.png" });
await browser.close();
process.exit(0);
