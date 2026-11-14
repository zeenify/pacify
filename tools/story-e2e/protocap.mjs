import puppeteer from "puppeteer-core";
import path from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const SHOTS = "C:\\Users\\EDRICK\\Desktop\\pacify\\gui-test-screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: path.join(SHOTS, `${n}.png`) }); };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900", "--mute-audio"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
try {
  await page.goto(FILE);
  await sleep(800);
  // forward beat frames in slow-mo (3x -> 3300ms total)
  page.evaluate(() => playForward(true));
  const beats = [[500,"v2-f-b1"],[1100,"v2-f-b2mid"],[1600,"v2-f-landed"],[1900,"v2-f-stamp"],[2400,"v2-f-slash"],[2700,"v2-f-splitmid"],[3450,"v2-f-revealed"]];
  let prev = 0;
  for (const [t, name] of beats) { await sleep(t - prev); prev = t; await shot(name); }
  await sleep(600);
  // back frames in slow-mo (1650ms)
  page.evaluate(() => playBack(true));
  const bbeats = [[300,"v2-b-sweep"],[700,"v2-b-chevrons"],[1300,"v2-b-pocketmid"],[1750,"v2-b-done"]];
  prev = 0;
  for (const [t, name] of bbeats) { await sleep(t - prev); prev = t; await shot(name); }
  console.log("OK proto captures");
} catch (e) { console.error("FAILED:", String(e).slice(0, 300)); process.exitCode = 1; }
finally { await browser.close(); }
