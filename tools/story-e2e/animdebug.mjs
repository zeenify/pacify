import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGE-ERROR:", String(e).slice(0, 200)));
await page.goto(FILE);
await sleep(600);
page.evaluate(() => playForward(true));
const marks = process.env.MARKS ? JSON.parse(process.env.MARKS) : [300, 800, 1400, 1800, 2400];
let prev = 0;
for (const t of marks) {
  await sleep(t - prev); prev = t;
  const state = await page.evaluate(() => {
    const card = document.querySelector(".nv-card:not(.shadow)");
    const anims = card ? document.getAnimations().filter((a) => a.animationName === "nv-card").map((a) => ({ play: a.playState, t: Math.round(a.currentTime) })) : [];
    return {
      cls: document.getElementById("navt").className,
      cardTransform: card ? getComputedStyle(card).transform.slice(0, 70) : "no-card",
      cardAnim: anims,
      fwd: getComputedStyle(document.getElementById("navt")).getPropertyValue("--fwd"),
    };
  });
  console.log(`t≈${t}ms`, JSON.stringify(state));
}
await browser.close();
process.exit(0);
