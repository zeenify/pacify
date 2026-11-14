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
try {
  // howto → menu via its "‹ MENU" control (replace into a hub = back mirror)
  await page.goto(`${BASE}/howto`, { waitUntil: "networkidle2" });
  await sleep(1500);
  await page.evaluate(() => { (window).__navSlow = true; });
  await page.evaluate(() => {
    [...document.querySelectorAll("div")].find((el) => /MENU/.test(el.textContent ?? "") && (el.textContent ?? "").length < 12 && el.offsetParent !== null)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector(".navt")?.className.includes("reveal"), { timeout: 12000 });
  await sleep(100);
  await shot("p-back-carry");
  await sleep(150);
  await shot("p-back-settle");
  console.log("menu path:", await page.evaluate(() => location.pathname));
  console.log("OK back");
} catch (e) {
  await shot("p-FAIL-back");
  console.error("FAILED:", String(e).slice(0, 300));
  process.exitCode = 1;
} finally { await browser.close(); }
