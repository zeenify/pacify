import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
await page.goto(FILE + "?b=" + Date.now());
await sleep(600);
const cssom = await page.evaluate(() => {
  const kf = [];
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) kf.push(rule.name);
    }
  }
  const card = document.querySelector(".nv-card");
  return {
    keyframes: kf,
    cardAnimationName: card ? getComputedStyle(card).animationName : "no-card",
    navtVars: getComputedStyle(document.getElementById("navt")).getPropertyValue("--fwd"),
    navtClass: document.getElementById("navt").className,
  };
});
console.log(JSON.stringify(cssom, null, 1));
page.evaluate(() => playForward(true));
await sleep(1800);
const live = await page.evaluate(() => ({
  playingClass: document.getElementById("navt").className,
  cardAnim: getComputedStyle(document.querySelector(".nv-card")).animationName,
  cardTransform: getComputedStyle(document.querySelector(".nv-card")).transform.slice(0, 60),
  animations: document.getAnimations().map((a) => a.animationName),
}));
console.log("LIVE:", JSON.stringify(live, null, 1));
await browser.close();
process.exit(0);
