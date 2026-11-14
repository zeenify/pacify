// HUMAN-EXPERIENCE PLAYTEST — one continuous Chrome session, two full duels plus a
// third rematch check. Screenshots every scene; logs every Klein line with timing.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const SHOTS = "C:\\Users\\EDRICK\\Desktop\\pacify\\gui-test-screenshots";
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); log("shot:", name); };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-first-run", "--no-default-browser-check", "--window-size=1600,900", "--mute-audio"],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
const waitForPath = async (p, timeout = 45000) => {
  await page.waitForFunction((want) => location.pathname === want, { timeout }, p);
  log("path:", await page.evaluate(() => location.pathname + location.search));
};
const clickText = async (text, timeout = 8000) => {
  await page.waitForFunction((t) => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === t && el.offsetParent !== null), { timeout }, text);
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll("div,span,button")].find((el) => el.textContent?.trim() === t && el.offsetParent !== null);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, text);
};
const typeInto = async (selector, value) => {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.focus(selector);
  await page.type(selector, value, { delay: 15 });
};
const advanceStory = async () => {
  if ((await page.evaluate(() => location.pathname)) === "/duel") return false;
  try {
    await page.click('[data-testid="story-advance"]');
    await sleep(350);
    if ((await page.evaluate(() => location.pathname)) === "/duel") return false;
    await page.click('[data-testid="story-advance"]');
  } catch { /* unmounted to /duel */ }
  return (await page.evaluate(() => location.pathname)) !== "/duel";
};
const challengeKlein = async () => {
  await sleep(1500);
  await page.evaluate(() => { [...document.querySelectorAll('[class*="dWrap"]')][0].dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await sleep(900);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="dChallengePress"]')][0];
    if (!btn) throw new Error("challenge button did not appear");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await waitForPath("/story", 30000);
};

try {
  const user = process.env.HX_USER ?? "story_hx_mwfyroz7";
  log("signing in as", user);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  const signIn = await page.evaluate(() => [...document.querySelectorAll("div,span,button")].some((el) => el.textContent?.trim() === "SIGN IN"));
  if (signIn) await clickText("SIGN IN");
  await typeInto('input[placeholder="_______________"]', user);
  await typeInto('input[placeholder="min. 6 characters"]', "hx-pass-123");
  await clickText("ENTER CLASS");
  await waitForPath("/load", 30000);
  await waitForPath("/start", 30000);
  await clickText("ENTER");
  await waitForPath("/menu", 15000);
  await clickText("CAMPAIGN");
  await waitForPath("/campaign", 15000);
  await sleep(2000);
  await shot("h-01-campaign");

  for (const duelNo of [process.env.HX_DUELS === "2" ? 2 : 1, process.env.HX_DUELS === "2" ? 2 : 1].map((v, i) => process.env.HX_DUELS === "2" ? [2, 3][i] : v)) {
    log(`===== ENCOUNTER ${duelNo} =====`);
    await challengeKlein();
    const enc = await page.evaluate(() => new URLSearchParams(location.search).get("encounter"));
    log(`encounter ${duelNo}:`, enc, "— waiting for scene…");
    const tScene0 = Date.now();
    await page.waitForSelector('[data-testid="story-text"]', { timeout: 60000 });
    log(`scene ready in ${Date.now() - tScene0}ms`);
    for (let i = 0; i < 12; i++) {
      await sleep(1100);
      if ((await page.$$('[data-testid^="reply-"]')).length) break;
      if ((await page.evaluate(() => location.pathname)) !== "/story") break;
      const line = await page.$eval('[data-testid="story-text"]', (el) => el.textContent);
      log(`prelude ${i + 1}:`, line);
      await shot(`h-e${duelNo}-pre${i + 1}`);
      if (!(await advanceStory())) break;
    }
    const choices = await page.$$('[data-testid^="reply-"]');
    if (choices.length) {
      const pick = `reply-c${((duelNo - 1) % 3) + 1}`;
      log("reply choices shown — picking", pick);
      await shot(`h-e${duelNo}-choices`);
      await page.click(`[data-testid="${pick}"]`);
      await sleep(700);
      const replyLine = await page.$eval('[data-testid="story-text"]', (el) => el.textContent).catch(() => "");
      log("exchange bubble:", replyLine);
      await shot(`h-e${duelNo}-reply`);
      for (let i = 0; i < 6; i++) { await sleep(600); if (!(await advanceStory())) break; }
    } else {
      log("no reply choices this scene");
      for (let i = 0; i < 6; i++) { await sleep(600); if (!(await advanceStory())) break; }
    }
    await waitForPath("/duel", 30000);
    await sleep(2200);

    let prevMsg = "";
    for (let round = 1; round <= 9; round++) {
      await page.waitForFunction(() => {
        const cards = [...document.querySelectorAll('[class*="cardBtn"]')];
        return cards.some((el) => !el.className.includes("cardDim"));
      }, { timeout: 90000, polling: 500 });
      await page.evaluate(() => {
        const card = [...document.querySelectorAll('[class*="cardBtn"]')].find((el) => !el.className.includes("cardDim"));
        card.click();
      });
      log(`— round ${round}: card picked`);
      // collect up to 3 bubble lines (thinking / commit / reveal reaction)
      for (let beat = 0; beat < 3; beat++) {
        const landed = await page.waitForFunction((prev) => {
          if (document.querySelector('[data-testid="story-continue"]')) return "__result__";
          const el = document.querySelector('[class*="bubbleTxt"]');
          const t = el?.textContent?.trim() ?? "";
          const cards = [...document.querySelectorAll('[class*="cardBtn"]')];
          const nextHand = cards.some((c) => !c.className.includes("cardDim"));
          if (t && t !== prev && !nextHand) return t;
          if (nextHand) return "__next__";
          return false;
        }, { timeout: 45000, polling: 400 }, prevMsg).catch(() => null);
        const value = landed ? await landed.jsonValue() : null;
        if (value === "__result__") { prevMsg = "__result__"; break; }
        if (value === "__next__" || value === null) break;
        prevMsg = value;
        log(`  round ${round} bubble:`, value);
        await shot(`h-e${duelNo}-r${round}b${beat + 1}`);
      }
      const outcome = await page.waitForFunction(() => {
        if (document.querySelector('[data-testid="story-continue"]')) return "result";
        const cards = [...document.querySelectorAll('[class*="cardBtn"]')];
        if (cards.some((el) => !el.className.includes("cardDim"))) return "next";
        return false;
      }, { timeout: 120000, polling: 800 });
      if ((await outcome.jsonValue()) === "result") {
        await sleep(600);
        const score = await page.evaluate(() => [...document.querySelectorAll('[class*="resultScore"]')].map((e) => e.textContent).join(" "));
        log("RESULT:", score);
        await shot(`h-e${duelNo}-result`);
        await page.click('[data-testid="story-continue"]');
        await waitForPath("/story", 20000);
        for (let i = 0; i < 8; i++) {
          await sleep(1200);
          if ((await page.evaluate(() => location.pathname)) === "/campaign") break;
          const line = await page.$eval('[data-testid="story-text"]', (el) => el.textContent).catch(() => "");
          if (line) { log(`epilogue ${i + 1}:`, line); await shot(`h-e${duelNo}-epi${i + 1}`); }
          await advanceStory();
        }
        await waitForPath("/campaign", 20000);
        await shot(`h-e${duelNo}-after`);
        break;
      }
    }
  }

  log("===== ENCOUNTER 3 (prelude only) =====");
  await challengeKlein();
  const t0 = Date.now();
  await page.waitForSelector('[data-testid="story-text"]', { timeout: 60000 });
  log(`third scene ready in ${Date.now() - t0}ms`);
  await sleep(4000);
  log("third prelude:", await page.$eval('[data-testid="story-text"]', (el) => el.textContent));
  await shot("h-e3-pre1");
  console.log("OK marathon");
} catch (e) {
  await shot("h-FAIL").catch(() => {});
  console.error("FAILED:", String(e).slice(0, 600));
  process.exitCode = 1;
} finally {
  await browser.close();
}
