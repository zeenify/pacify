import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
await page.goto(FILE + "?b=" + Date.now());
await sleep(600);
page.evaluate(() => { (window).__navScale = 8; playBack(true); });
await sleep(1500);
const probe = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".nv-card")].map((c) => ({
    cls: c.className, z: getComputedStyle(c).zIndex, pos: getComputedStyle(c).position, top: getComputedStyle(c).top,
    transform: getComputedStyle(c).transform,
    rect: (() => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
  }));
  const hit = document.elementFromPoint(800, 450);
  return { cards, hit: hit ? hit.className + " < " + (hit.parentElement?.className ?? "") : "none" };
});
console.log(JSON.stringify(probe, null, 1));
await browser.close();
process.exit(0);
