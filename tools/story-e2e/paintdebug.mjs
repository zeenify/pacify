import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = "file:///C:/Users/EDRICK/.zcode/v2/visualizations/c7f8a5726f4be9539b2ab26fef8fedb77fe645061fe75de421fccd53a8126d89/pacify-transitions-v2.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
await page.goto(FILE + "?b=" + Date.now());
await sleep(600);
page.evaluate(() => playForward(true));
await sleep(1800); // deep in the hold
const truth = await page.evaluate(() => {
  const card = document.querySelector(".nv-card:not(.shadow)");
  const face = card?.querySelector(".face");
  const cs = face ? getComputedStyle(face) : null;
  const before = face ? getComputedStyle(face, "::before") : null;
  const rect = card?.getBoundingClientRect();
  const hit = document.elementFromPoint(800, 450);
  return {
    cardExists: !!card,
    cardRect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
    faceBackground: cs?.backgroundColor,
    faceBeforeClip: before?.clipPath?.slice(0, 90),
    faceBeforeBg: before?.backgroundColor,
    hitTestAtCenter: hit ? hit.className + " / " + (hit.parentElement?.className ?? "") : "none",
    navtChildren: [...(document.getElementById("navt")?.children ?? [])].map((c) => c.className).join(" | "),
  };
});
console.log(JSON.stringify(truth, null, 1));
await page.screenshot({ path: "C:/Users/EDRICK/Desktop/pacify/gui-test-screenshots/truth-hold.png" });
await browser.close();
process.exit(0);
