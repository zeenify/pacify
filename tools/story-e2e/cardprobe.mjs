import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-first-run", "--window-size=1600,900"], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
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
await page.type('input[placeholder="_______________"]', "story_hx_mwfyroz7", { delay: 6 });
await page.type('input[placeholder="min. 6 characters"]', "hx-pass-123", { delay: 6 });
await clickText("ENTER CLASS");
await page.waitForFunction(() => ["/start", "/menu"].includes(location.pathname), { timeout: 30000 });
await page.goto(`${BASE}/menu`, { waitUntil: "networkidle2" });
await sleep(1000);
page.evaluate(() => { (window).__navScale = 8; [...document.querySelectorAll("div,span")].find((el) => el.textContent?.trim() === "CAMPAIGN" && el.offsetParent !== null)?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
await sleep(1800); // 20% into the 8800ms throw
const probe = await page.evaluate(() => {
  const card = document.querySelector('.nv-card.main');
  const face = card?.querySelector('.face');
  const before = face ? getComputedStyle(face, '::before') : null;
  const after = face ? getComputedStyle(face, '::after') : null;
  const cs = card ? getComputedStyle(card) : null;
  const rect = card?.getBoundingClientRect();
  return {
    cardExists: !!card,
    position: cs?.position, top: cs?.top, left: cs?.left, zIndex: cs?.zIndex,
    transform: cs?.transform.slice(0, 60),
    rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width) } : null,
    bg: cs?.backgroundColor,
    facePos: face ? getComputedStyle(face).position : "no-face",
    faceRect: (() => { if (!face) return null; const r = face.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
    faceBg: face ? getComputedStyle(face).backgroundColor : "-",
    faceBeforePos: before?.position, faceBeforeInset: before?.inset, faceBeforeClip: before?.clipPath?.slice(0, 60),
    faceAfterBg: after?.backgroundColor, faceAfterInset: after?.inset,
    animationName: cs?.animationName,
    animState: document.getAnimations().filter((a) => a.animationName === "nv-card").map((a) => a.playState + "@" + Math.round(a.currentTime)),
  };
});
console.log(JSON.stringify(probe, null, 1));
await browser.close();
process.exit(0);
