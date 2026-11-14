// Real-browser user-flow test for the Klein relationship loop.
// Drives system Chrome (headless) through: register → campaign → Klein prelude
// (typewriter + reply exchange) → full duel (thinking/commit/reveal beats) →
// result screen → CONTINUE → epilogue → campaign → rematch prelude memory check.
// Usage: node flow.mjs <stage>   stages: auth | prelude | duel | rematch
// Stage state resumes via tools/story-e2e/state.json + cookies.json.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8081";
const ROOT = "C:\\Users\\EDRICK\\Desktop\\pacify";
const SHOTS = path.join(ROOT, "gui-test-screenshots");
const DIR = path.join(ROOT, "tools", "story-e2e");
const stage = process.argv[2] ?? "auth";
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(DIR, { recursive: true });
const read = (f, d) => (fs.existsSync(path.join(DIR, f)) ? JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) : d);
const write = (f, v) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(v, null, 2));
const state = read("state.json", {});
const saveState = (patch) => { Object.assign(state, patch); write("state.json", state); };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-first-run", "--no-default-browser-check", "--window-size=1600,900", "--mute-audio"],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => log("PAGE-ERROR:", String(e).slice(0, 200)));
const shot = async (name) => { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); log("shot:", name); };
const waitForPath = async (p, timeout = 45000) => {
  await page.waitForFunction((want) => location.pathname === want, { timeout }, p);
  log("path:", await page.evaluate(() => location.pathname + location.search));
};
// Story-advance click that survives the screen unmounting to /duel mid-loop.
const advanceStory = async () => {
  if ((await page.evaluate(() => location.pathname)) === "/duel") return false;
  try {
    await page.click('[data-testid="story-advance"]');
    await sleep(350);
    if ((await page.evaluate(() => location.pathname)) === "/duel") return false;
    await page.click('[data-testid="story-advance"]');
  } catch { /* screen unmounted to /duel between check and click */ }
  return (await page.evaluate(() => location.pathname)) !== "/duel";
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
const useCookies = async () => { const c = read("cookies.json", []); if (c.length) await page.setCookie(...c); };
const challengeKlein = async () => {
  await page.goto(`${BASE}/campaign`, { waitUntil: "networkidle2" });
  await sleep(2500);
  await page.evaluate(() => { [...document.querySelectorAll('[class*="dWrap"]')][0].dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await sleep(900);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="dChallengePress"]')][0];
    if (!btn) throw new Error("challenge button did not appear");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await waitForPath("/story", 30000);
};

async function main() {
try {
  if (stage === "auth") {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
    const user = `story_e2e_${Date.now().toString(36)}`;
    log("registering", user);
    await typeInto('input[placeholder="_______________"]', user);
    await typeInto('input[placeholder="min. 6 characters"]', "e2e-pass-123");
    await clickText("SUBMIT FORM");
    await waitForPath("/load", 30000);
    await waitForPath("/start", 30000);
    await clickText("ENTER");
    await waitForPath("/menu", 15000);
    await clickText("CAMPAIGN");
    await waitForPath("/campaign", 15000);
    await sleep(2000);
    saveState({ user });
    write("cookies.json", await page.cookies());
    await shot("e2e-01-campaign");
    console.log("OK auth", user);
  }

  if (stage === "prelude") {
    await useCookies();
    await challengeKlein();
    const encounterId = await page.evaluate(() => new URLSearchParams(location.search).get("encounter"));
    saveState({ encounterId, duelUrl: `/duel?encounter=${encounterId}` });
    log("encounter:", encounterId, "— waiting for scene (LLM generation can take ~20s)…");
    await page.waitForSelector('[data-testid="story-text"]', { timeout: 60000 });
    await sleep(4000); // let the typewriter produce some text
    log("line1:", await page.$eval('[data-testid="story-text"]', (el) => el.textContent));
    await shot("e2e-02-prelude-line1");
    let choices = false;
    for (let i = 0; i < 12; i++) {
      await sleep(1200);
      if ((await page.$$('[data-testid^="reply-"]')).length) { choices = true; break; }
      const p = await page.evaluate(() => location.pathname);
      if (p === "/duel") break;
      const line = await page.$eval('[data-testid="story-text"]', (el) => el.textContent);
      log(`line ${i + 1}:`, line.slice(0, 90));
      if (i === 1) await shot("e2e-03-prelude-mid");
      if (!(await advanceStory())) break;
    }
    if (choices) {
      log("REPLY EXCHANGE PRESENT — picking reply-c1");
      await shot("e2e-04-reply-choices");
      await page.click('[data-testid="reply-c1"]');
      saveState({ replied: true });
      // Klein's scripted response becomes an extra bubble; advance until the duel opens
      for (let i = 0; i < 6; i++) {
        await sleep(700);
        if (!(await advanceStory())) break;
      }
    } else {
      log("no reply choices in this scene (generator omitted the exchange)");
    }
    await waitForPath("/duel", 30000);
    saveState({ duelUrl: await page.evaluate(() => location.pathname + location.search) });
    await sleep(1500);
    await shot("e2e-05-duel-open");
    console.log("OK prelude", JSON.stringify({ choices, encounterId }));
  }

  if (stage === "duel") {
    await useCookies();
    if (!state.duelUrl) throw new Error("run prelude stage first");
    await page.goto(`${BASE}${state.duelUrl}`, { waitUntil: "networkidle2" });
    await sleep(2500);
    await page.waitForSelector('[class*="cardBtn"]', { timeout: 45000 });
    for (let round = 1; round <= 9; round++) {
      await page.waitForFunction(() => {
        const cards = [...document.querySelectorAll('[class*="cardBtn"]')];
        return cards.some((el) => !el.className.includes("cardDim"));
      }, { timeout: 90000, polling: 500 });
      await page.evaluate(() => {
        const card = [...document.querySelectorAll('[class*="cardBtn"]')].find((el) => !el.className.includes("cardDim"));
        card.click();
      });
      log(`round ${round}: card picked`);
      await sleep(1200);
      const msg = await page.evaluate(() => document.body.innerText.match(/KLEIN\n([\s\S]{5,120}?)(?:\n|$)/)?.[1] ?? null);
      if (msg) log(`round ${round} klein:`, msg.slice(0, 90));
      const outcome = await page.waitForFunction(() => {
        if (document.querySelector('[data-testid="story-continue"]')) return "result";
        const cards = [...document.querySelectorAll('[class*="cardBtn"]')];
        if (cards.some((el) => !el.className.includes("cardDim"))) return "next";
        return false;
      }, { timeout: 120000, polling: 1000 });
      const value = await outcome.jsonValue();
      log(`round ${round}: → ${value}`);
      if (value === "result") {
        await sleep(500);
        const score = await page.evaluate(() => [...document.querySelectorAll('[class*="resultScore"]')].map((e) => e.textContent).join(" | "));
        const saved = await page.evaluate(() => [...document.querySelectorAll('[class*="resultSaved"]')].map((e) => e.textContent).join(""));
        log("final:", score, "·", saved);
        await shot("e2e-06-result");
        saveState({ duelDone: true });
        // CONTINUE → epilogue scene
        await page.click('[data-testid="story-continue"]');
        await waitForPath("/story", 20000);
        log("epilogue url:", await page.evaluate(() => location.search));
        await page.waitForSelector('[data-testid="story-text"]', { timeout: 60000 });
        await sleep(4000);
        const line = await page.$eval('[data-testid="story-text"]', (el) => el.textContent);
        log("epilogue line1:", line);
        await shot("e2e-07-epilogue");
        let back = false;
        for (let i = 0; i < 10; i++) {
          await sleep(600);
          const path = await page.evaluate(() => location.pathname);
          if (path === "/campaign") { back = true; break; }
          if (path !== "/story") continue;
          await advanceStory();
        }
        if (!back) throw new Error("epilogue did not return to campaign");
        await shot("e2e-08-campaign-after-epilogue");
        console.log("OK duel+epilogue");
        return;
      }
    }
    throw new Error("duel did not finish in 9 rounds");
  }

  if (stage === "rematch") {
    await useCookies();
    await challengeKlein();
    const encounterId = await page.evaluate(() => new URLSearchParams(location.search).get("encounter"));
    saveState({ rematchEncounterId: encounterId });
    await page.waitForSelector('[data-testid="story-text"]', { timeout: 60000 });
    await sleep(5000);
    const text = await page.$eval('[data-testid="story-text"]', (el) => el.textContent);
    log("rematch prelude line1:", text);
    await shot("e2e-09-rematch-prelude");
    console.log("OK rematch", JSON.stringify({ encounterId, text }));
  }

  console.log(`STAGE ${stage} COMPLETE`);
} catch (e) {
  await shot(`e2e-FAIL-${stage}`).catch(() => {});
  console.error("FAILED:", stage, String(e).slice(0, 600));
  process.exitCode = 1;
}
}
main().finally(async () => {
  await browser.close();
});
