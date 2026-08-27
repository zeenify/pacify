/* Terminal duel — LLM player vs god brain (Klein).
   The LLM sees: own hand, burned cards, scores, round, own possible cards.
   The LLM does NOT see: Klein's hand, Klein's locked card, or Klein's strategy.
   Klein (original design): FULL VISION of the player's hand from round 1.
   All moves are logged to duel-live-log.txt for review.

   Usage:
     node duel-live.js --new              start a new duel
     node duel-live.js --status           show current state (fair view)
     node duel-live.js --pick <cardName>  lock your card, resolve round
     node duel-live.js --next             advance to next round after reveal
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDuel, brainView, CATALOGUE, TOTAL_ROUNDS, SCORE_THRESHOLD, resolveRound } from "./src/index.js";
import { chooseGodCard } from "../ai-brain/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "duel-live-state.json");
const LOG_FILE = path.join(__dirname, "duel-live-log.txt");
const args = process.argv.slice(2);
const cmd = args[0];

const toCard = (id) => CATALOGUE.find((c) => c.id === id);

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  return {
    ...raw,
    p1Hand: raw.p1Hand.map(toCard),
    p2Hand: raw.p2Hand.map(toCard),
    p1Locked: raw.p1Locked ? toCard(raw.p1Locked) : null,
    p2Locked: raw.p2Locked ? toCard(raw.p2Locked) : null,
    burned: raw.burned.map(toCard),
    peeked: (raw.peeked || []).map(toCard),
  };
}

function saveState(state) {
  // Mirror to web public for live spectator
  try { fs.writeFileSync('C:/Users/EDRICK/Desktop/pacify/apps/web/public/duel-live-state.json', JSON.stringify({
    round: state.round, p1Score: state.p1Score, p2Score: state.p2Score,
    p1Hand: state.p1Hand.map(c => c.id), p2Hand: state.p2Hand.map(c => c.id),
    p1Locked: state.p1Locked?.id ?? null, p2Locked: state.p2Locked?.id ?? null,
    burned: state.burned.map(c => c.id), peeked: (state.peeked || []).map(c => c.id),
    shieldOff: state.shieldOff, echoNext: state.echoNext, phase: state.phase,
    result: state.result, log: state.log || []
  })); } catch(e) {}
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    seed: state.seed,
    round: state.round,
    p1Score: state.p1Score,
    p2Score: state.p2Score,
    p1Hand: state.p1Hand.map(c => c.id),
    p2Hand: state.p2Hand.map(c => c.id),
    p1Locked: state.p1Locked?.id ?? null,
    p2Locked: state.p2Locked?.id ?? null,
    burned: state.burned.map(c => c.id),
    peeked: (state.peeked || []).map(c => c.id),
    shieldOff: state.shieldOff,
    echoNext: state.echoNext,
    phase: state.phase,
    result: state.result,
    transcript: state.transcript || [],
    lastRound: state.lastOutcome ? {
      p1Name: state.lastOutcome.p1Card?.name ?? "",
      p2Name: state.lastOutcome.p2Card?.name ?? "",
      p1Points: state.lastOutcome.p1Points,
      p2Points: state.lastOutcome.p2Points,
      voided: state.lastOutcome.voided,
      wardBlocked: state.lastOutcome.wardBlocked,
      reversalSwapped: state.lastOutcome.reversalSwapped,
      scoreWiped: state.lastOutcome.scoreWiped,
      eclipseFired: state.lastOutcome.eclipseFired,
    } : null,
  }));
}

function logToFile(msg) {
  fs.appendFileSync(LOG_FILE, msg + "\n", "utf8");
}

function aiLock(state) {
  // FULL VISION (original design): Klein sees all 7 of the player's cards from
  // the start — same as duel-prototype.html. Injected as `peeked`, which
  // beliefWeights now weights at 100% (the hand is known with certainty).
  const view = { ...brainView(state), peeked: [...state.p1Hand] };
  const pick = chooseGodCard(view, { studentId: 2, codename: "KLEIN", epsilon: 0, trickWeights: {} });
  state.p2Locked = pick;
  state.p2Hand = state.p2Hand.filter(c => c.id !== pick.id);
  return pick;
}

function showStatus(state) {
  // FAIR VIEW — merged uncertainty pool: everything not burned and not in your
  // hand. Klein's actual cards are indistinguishable from undealt phantoms, so
  // the player cannot deduce his hand from this list. Order is deterministically
  // shuffled (stable within a round) so no positional signal exists either.
  const knownIds = new Set(state.p1Hand.map(b => b.id));
  const pool = CATALOGUE.filter(c =>
    !state.burned.some(b => b.id === c.id) &&
    !knownIds.has(c.id)
  );
  let h = ((state.seed || 0) ^ (state.round * 0x9e3779b9)) >>> 0;
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const possibles = shuffled.map(c => `${c.name}[${c.power ?? "?"}]`).join(", ");

  console.log(`\n=== ROUND ${state.round}/${TOTAL_ROUNDS} ===`);
  console.log(`YOU: ${state.p1Score}  |  KLEIN: ${state.p2Score}`);
  console.log(`Echo next: ${state.echoNext ? "YES ×2" : "no"}`);
  console.log(`Shields off: ${state.shieldOff > 0 ? `YES (${state.shieldOff} rounds left)` : "no"}`);
  console.log(`\nYour hand (${state.p1Hand.length}):`);
  state.p1Hand.forEach(c => {
    const p = c.power ?? "—";
    const tag = c.kind === "trick" ? "TRICK" : (c.align || "").toUpperCase();
    console.log(`  ${c.name} [${p}] ${tag}`);
  });
  console.log(`\nBurned: ${state.burned.map(c => `${c.name}[${c.power ?? "?"}]`).join(", ") || "none"}`);
  console.log(`Klein's possible cards: ${possibles}`);
  console.log(`\nPhase: ${state.phase}`);
  if (state.phase === "commit") console.log(`\n→ Pick: node duel-live.js --pick <cardName>`);
  if (state.phase === "reveal") console.log(`\n→ Next: node duel-live.js --next`);
  if (state.phase === "over" && state.result) console.log(`\n→ ${state.result.winner === "p1" ? "YOU WIN" : state.result.winner === "p2" ? "KLEIN WINS" : "DRAW"} ${state.p1Score}-${state.p2Score}`);
}

const POLICY = { studentId: 2, codename: "KLEIN", epsilon: 0, trickWeights: {} };

if (cmd === "--new") {
  const seed = Math.floor(Math.random() * 1000000);
  let state = createDuel({ seed, studentId: 2 });
  const pick = aiLock(state);
  saveState(state);
  // Log Klein's hand + lock secretly (review only)
  logToFile(`\n=== DUEL seed:${seed} ===`);
  logToFile(`Klein hand: ${state.p2Hand.map(c => c.name).join(", ")} | Klein locked: ${pick.name}`);
  console.log(`New duel (seed ${seed}). Klein has locked a card.`);
  console.log(`Your hand: ${state.p1Hand.map(c => `${c.name}[${c.power ?? "?"}]`).join(", ")}`);
  console.log(`\n→ node duel-live.js --status to see full board`);
} else if (cmd === "--status") {
  const state = loadState();
  if (!state) { console.log("No duel. Start with --new"); process.exit(0); }
  showStatus(state);
} else if (cmd === "--pick") {
  const cardName = (args[1] || "").toLowerCase();
  const state = loadState();
  if (!state) { console.log("No duel."); process.exit(0); }
  if (state.phase !== "commit") { console.log("Not in commit phase."); process.exit(0); }
  const card = state.p1Hand.find(c => c.name.toLowerCase() === cardName || c.id === cardName);
  if (!card) { console.log(`Card "${cardName}" not in your hand. Your hand: ${state.p1Hand.map(c=>c.name).join(", ")}`); process.exit(0); }

  const p2Card = state.p2Locked;
  state.p1Hand = state.p1Hand.filter(c => c.id !== card.id);
  state.p2Hand = state.p2Hand.filter(c => c.id !== p2Card.id);
  state.burned.push(card, p2Card);

  const out = resolveRound({
    p1Card: card,
    p2Card: p2Card,
    p1Score: state.p1Score,
    p2Score: state.p2Score,
    round: state.round,
    echoNext: state.echoNext,
    shieldOff: state.shieldOff,
  });
  state.p1Score = Math.max(0, out.p1Score);
  state.p2Score = Math.max(0, out.p2Score);
  state.echoNext = out.echoNext;
  state.shieldOff = out.shieldOffAfter;
  state.lastOutcome = out;

  const flags = [out.voided&&"VOID", out.wardBlocked&&"WARD", out.reversalSwapped&&"SWAP!", out.scoreWiped&&"SCORE EXECUTED!", out.echoNext&&"NEXT ×2", out.eclipseFired&&"ECLIPSE!"].filter(Boolean).join(" · ");
  const line = `R${state.round}: You ${card.name} vs Klein ${p2Card.name} → You ${out.p1Points>0?"+"+out.p1Points:"+0"} · Klein ${out.p2Points>0?"+"+out.p2Points:"+0"}${flags ? " · " + flags : ""}`;
  console.log(`\n${line}`);
  console.log(`Totals: You ${state.p1Score} · Klein ${state.p2Score}`);
  logToFile(line);

  const thresholdHit = state.p1Score >= SCORE_THRESHOLD || state.p2Score >= SCORE_THRESHOLD;
  if (thresholdHit || state.round >= TOTAL_ROUNDS) {
    state.phase = "over";
    state.result = { winner: state.p1Score > state.p2Score ? "p1" : state.p2Score > state.p1Score ? "p2" : "draw" };
    const reason = thresholdHit && state.round < TOTAL_ROUNDS ? ` — first to ${SCORE_THRESHOLD}!` : "";
    const final = `\nFINAL ${state.p1Score}-${state.p2Score}${reason} — ${state.result.winner === "p1" ? "YOU WIN" : state.result.winner === "p2" ? "KLEIN WINS" : "DRAW"}`;
    console.log(final);
    logToFile(final);
    saveState(state);
  } else {
    state.phase = "reveal";
    saveState(state);
    console.log(`\n→ Next: node duel-live.js --next`);
  }
} else if (cmd === "--next") {
  const state = loadState();
  if (!state || state.phase !== "reveal") { console.log("Not in reveal phase."); process.exit(0); }
  state.round += 1;
  state.p1Locked = null; state.p2Locked = null;
  state.phase = "commit";
  const pick = aiLock(state);
  saveState(state);
  logToFile(`R${state.round} Klein locked: ${pick.name}`);
  console.log(`Round ${state.round}. Klein has locked.`);
  showStatus(state);
} else {
  console.log("Usage: node duel-live.js --new | --status | --pick <cardName> | --next");
}
