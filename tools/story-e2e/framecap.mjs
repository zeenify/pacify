import puppeteer from "puppeteer-core";
import path from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const SHOTS = "C:\\Users\\EDRICK\\Desktop\\pacify\\gui-test-screenshots";
const shot = async (n) => { await page.screenshot({ path: path.join(SHOTS, `${n}.png`) }); console.log("shot:", n); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900", "--mute-audio"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
await page.goto(FILE + "?b=" + Date.now());
await sleep(700);

// 8x slow-mo: nv-card animation lasts 8800ms. Beats in animation-ms:
// windup 0-960, throw 960-3360 (landed), stamp 3360-4160, hold->slash 5600-6560,
// split 6560-8800, revealed 8800.
page.evaluate(() => { (window).__navScale = 8; playForward(true); });
const beats = [
  [500, "v3-f-b1"], [2400, "v3-f-throw"], [3500, "v3-f-landed"], [4300, "v3-f-stamp"],
  [6200, "v3-f-slash"],
];
let prev = 0;
for (const [target, name] of beats) {
  await page.waitForFunction((t) => {
    const anim = document.getAnimations().find((a) => a.animationName === "nv-card");
    if (!anim) return false; return anim.currentTime >= t;
  }, { timeout: 30000, polling: 30 }, target);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  console.log("shot:", name, "@", target, "ms anim");
}
// split/revealed happen after the card clones take over — fixed offsets from the slash
await sleep(400); await shot("v3-f-split");
await sleep(1900); await shot("v3-f-revealed");
await sleep(600);

// back run at 8x: wait for the forward tail to fully end, then sweep 0-1600...
await page.waitForFunction(() => document.getElementById("navt").style.display === "none", { timeout: 30000 });
await sleep(300);
page.evaluate(() => { (window).__navScale = 8; playBack(true); });
const bbeats = [
  [900, "v3-b-sweep"], [1200, "v3-b-chev"], [1500, "v3-b-swap"], [2900, "v3-b-pocket"], [4600, "v3-b-done"],
];
for (const [target, name] of bbeats) {
  await page.waitForFunction((t) => {
    const anim = document.getAnimations().find((a) => a.animationName === "nv-back");
    if (!anim) return false; return anim.currentTime >= t;
  }, { timeout: 30000, polling: 30 }, target);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  console.log("shot:", name, "@", target, "ms anim");
}
await sleep(900); await shot("v3-b-done");
console.log("OK frames");
await browser.close();
process.exit(0);
