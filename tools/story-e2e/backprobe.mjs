import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
page.on("console", (m) => console.log("PAGE:", m.text()));
page.on("pageerror", (e) => console.log("PAGE-ERROR:", String(e).slice(0, 200)));
await page.goto(FILE + "?b=" + Date.now());
await sleep(700);
console.log("starting playBack(true) with __navScale=8");
page.evaluate(() => { (window).__navScale = 8; playBack(true); });
for (const t of [300, 900, 1700, 2600, 4000]) {
  await sleep(t - ([300, 900, 1700, 2600, 4000][[300, 900, 1700, 2600, 4000].indexOf(t) - 1] ?? 0));
  const state = await page.evaluate(() => {
    const back = document.querySelector(".nv-back:not(.ghost)");
    const anims = document.getAnimations().filter((a) => a.animationName?.startsWith("nv-back")).map((a) => a.animationName + "@" + Math.round(a.currentTime));
    return {
      cls: document.getElementById("navt").className,
      backTransform: back ? getComputedStyle(back).transform.slice(0, 80) : "no-back",
      backPos: back ? getComputedStyle(back).position : "-",
      anims,
      path: document.querySelector(".screen.on")?.className,
    };
  });
  console.log(`t≈${t}ms`, JSON.stringify(state));
}
await browser.close();
process.exit(0);
