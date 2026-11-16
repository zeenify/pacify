/* "HEIST TAKEOVER" screen transitions (design: smart-agent). React mounts one
   empty host above the router; WAAPI drives one artwork composition during
   the entrance, then lightweight diagonal covers open over the committed page.
   The nav module calls play(plan) and gets:
     covered — resolves when the art fully covers the screen (route swaps here)
     reveal() — starts the cut/split once the destination is actually visible;
                resolves when the overlay tears itself down.
   No router transforms compete with the reveal. Audio shares the plan's beat
   anchors and window.__navScale, with its receiving side scheduled at reveal().
   Reduced motion collapses everything to a short black fade. */
import { useEffect, useRef } from "react";
import { cancelTimeline, scheduleTimeline, type TimelineHandle } from "../lib/sfx";
import { setNavTransitionController } from "../lib/nav";
import { navScale, reducedNav, slabsFor, transitionCues, wordFor, type TransitionPlan } from "../lib/transition";

export type RunningTransition = {
  covered: Promise<void>;
  reveal: () => Promise<void>;
};
export type NavTransitionController = {
  play: (plan: TransitionPlan) => RunningTransition;
};

const EASE = {
  slam: "cubic-bezier(.2,1.5,.4,1)",
  snap: "cubic-bezier(.75,0,.2,1)",
  out: "cubic-bezier(.16,1,.3,1)",
  in: "cubic-bezier(.6,0,.95,.35)",
  lin: "linear",
} as const;
type Fill = FillMode;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** The scrolling slab marquee — the whole hold is the avalanche + its rolling text. */
function sheetHTML(tier: TransitionPlan["tier"], word: string): string {
  const slabs = slabsFor(word, tier);
  const slabTops = tier === "full" ? ["-18vh", "4vh", "26vh", "48vh", "70vh", "92vh"] : ["-8vh", "16vh", "43vh", "76vh"];
  const slabCls = ["n4sk", "n4sr", "n4sw", "n4sk", "n4sr", "n4sk"];
  const slabHTML = slabs.map((txt, i) =>
    `<div class="n4slab ${slabCls[i]}" data-k="s${i}" style="top:${slabTops[i]}"><div class="n4mq">${txt}</div></div>`).join("");
  return `<div class="n4sheet">
   <div class="n4sbg n4ht" data-k="sbg"></div>
   ${slabHTML}
  </div>`;
}

function shardsHTML(tier: TransitionPlan["tier"]): string {
  let out = '<div class="n4shards">';
  for (let i = 0; i < (tier === "full" ? 12 : 6); i++) out += '<div class="n4shard"></div>';
  return out + "</div>";
}

export function NavTransition() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNavTransitionController({
      play(p: TransitionPlan): RunningTransition {
        const host = hostRef.current;
        if (!host) { const done = Promise.resolve(); return { covered: done, reveal: () => done }; }
        host.style.background = ""; // restore the black entrance stage (a past reveal may have cleared it)
        const reduced = reducedNav();
        const S = reduced ? 1 : navScale();
        let coverResolve!: () => void;
        let revealResolve!: () => void;
        const covered = new Promise<void>((r) => { coverResolve = r; });
        const revealed = new Promise<void>((r) => { revealResolve = r; });
        const anims: Animation[] = [];
        const timers: ReturnType<typeof setTimeout>[] = [];
        const timelines = new Set<TimelineHandle>();
        let receiving: (() => void) | null = null;
        let torn = false;
        const A = (t: Element | string | Element[], kf: Keyframe[], atMs: number, len: number,
          ease: string = EASE.out, fill: Fill = "both") => {
          if (torn) return;
          const els = typeof t === "string" ? Array.from(host.querySelectorAll(t)) : (Array.isArray(t) ? t : [t]);
          for (const el of els) anims.push(el.animate(kf, { delay: atMs * S, duration: len * S, easing: ease, fill }));
        };
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms * S));
        const sound = (events: ReturnType<typeof transitionCues>["entrance"], phase: "entrance" | "reveal" = "entrance") => {
          if (torn) return;
          const h = scheduleTimeline(events.map((e) => ({ ...e, at: Math.max(0, e.at * S) })));
          timelines.add(h);
          if (typeof window !== "undefined") {
            const w = window as unknown as { __navCueSchedule?: { cue: string; offsetMs: number; phase: "entrance" | "reveal" }[] };
            (w.__navCueSchedule ??= []).push(...events.map((e) => ({ cue: e.cue, offsetMs: e.at * S, phase })));
          }
        };
        const beat = (n: string) => { (window as unknown as { __navBeat?: string }).__navBeat = n; };
        const flashAt = (atMs: number, len: number, peak = 0.9) => A(".n4flash", [{ opacity: peak }, { opacity: 0 }], atMs, len, EASE.out, "none");
        const shake = (el: Element, atMs: number, len: number) => A(el, [
          { transform: "translate(0,0)" }, { transform: "translate(-.7vh,.4vh)" }, { transform: "translate(.6vh,-.5vh)" },
          { transform: "translate(-.3vh,.2vh)" }, { transform: "translate(0,0)" }], atMs, len, EASE.lin, "none");
        const rings = (sel: string, atMs: number, len: number, stagger: number) =>
          Array.from(host.querySelectorAll(sel)).forEach((r, i) =>
            A(r, [{ transform: "scale(.15)", opacity: 1 }, { transform: "scale(3.4)", opacity: 0 }], atMs + i * stagger, len, EASE.out, "forwards"));

        const teardown = () => {
          if (torn) return;
          torn = true;
          timers.forEach(clearTimeout);
          timelines.forEach(cancelTimeline);
          timelines.clear();
          anims.forEach((a) => { try { a.cancel(); } catch { /* already gone */ } });
          host.className = "navt";
          host.style.background = "";
          host.style.display = "none";
          host.innerHTML = "";
          beat("DONE");
          coverResolve();
          revealResolve();
        };
        const commitCover = () => { coverResolve(); beat("COVER / SWAP"); };

        const startReceiving = () => {
          const start = receiving;
          receiving = null;
          start?.();
        };

        if (reduced) {
          host.innerHTML = "";
          host.style.display = "block";
          anims.push(host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 110, easing: EASE.out, fill: "forwards" }));
          timers.push(setTimeout(commitCover, 110));
          receiving = () => {
            anims.push(host.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: EASE.out, fill: "forwards" }));
            timers.push(setTimeout(teardown, 110));
          };
          return { covered, reveal: async () => { startReceiving(); await revealed; } };
        }

        host.innerHTML = "";
        host.style.display = "block";
        if (p.variant === "back") {
          /* ============ SHUTTER RETREAT ============ */
          beat("SHUTTER DOWN");
          host.innerHTML = `
            <div class="n4bar" style="top:-6vh;height:20vh"></div><div class="n4bar" style="top:13vh;height:16vh"></div>
            <div class="n4bar" style="top:28vh;height:22vh"></div><div class="n4bar" style="top:49vh;height:15vh"></div>
            <div class="n4bar" style="top:63vh;height:19vh"></div><div class="n4bar" style="top:81vh;height:25vh"></div>
            <div class="n4rsb">BACK TO THE HIDEOUT</div>
            <div class="n4rtx n4a">RETREAT &nbsp;&lt;&lt;&lt;</div>
            <svg class="n4chev" viewBox="0 0 60 60" style="left:62vw"><path d="M38 8L16 30l22 22"/><path d="M54 8L32 30l22 22"/></svg>
            <svg class="n4chev" viewBox="0 0 60 60" style="left:76vw"><path d="M38 8L16 30l22 22"/><path d="M54 8L32 30l22 22"/></svg>
            <div class="n4bstreak"></div><div class="n4flash"></div>`;
          const bars = Array.from(host.querySelectorAll(".n4bar"));
          bars.forEach((el, i) => A(el, [{ transform: "translateX(105%) skewX(-22deg)" }, { transform: "translateX(0) skewX(-22deg)" }],
            i * 18, p.coveredMs - 50, EASE.snap));
          A(".n4rtx", [{ transform: "translateX(100vw)", opacity: 1 }, { transform: "translateX(-115%)", opacity: 1 }],
            25, p.durationMs - 170, "cubic-bezier(.3,.1,.6,1)");
          A(".n4rsb", [{ transform: "rotate(-4deg) translateX(30vw)", opacity: 0 }, { transform: "rotate(-4deg) translateX(0)", opacity: 1 }],
            p.coveredMs * 0.4, 160, EASE.slam);
          Array.from(host.querySelectorAll(".n4chev")).forEach((c, i) =>
            A(c, [{ transform: "translateX(20vw)", opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: "translateX(-40vw)", opacity: 0 }],
              70 + i * 50, 300, EASE.out));
          at(p.coveredMs, commitCover);
          A(".n4bstreak", [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1, offset: 0.5 },
            { transform: "scaleX(1) translateX(-100%)", opacity: 0 }], p.coveredMs, p.revealAtMs + 100, EASE.snap);
          receiving = () => {
            if (torn) return;
            sound(transitionCues(p).reveal, "reveal");
            beat("SCATTER");
            host.style.background = "transparent"; // bars part over the live destination
            A(".n4rsb", [{ opacity: 1 }, { opacity: 0 }], 0, 120, EASE.lin, "forwards");
            bars.forEach((el, i) => A(el, [{ transform: "translateX(0) skewX(-22deg)" },
              { transform: `translate(-115%,${8 + i * 4}vh) skewX(-22deg) rotate(${-4 - i}deg)` }], i * 20, 340, EASE.in, "forwards"));
            at(p.revealMs, teardown);
          };
          sound(transitionCues(p).entrance);
          return { covered, reveal: async () => { startReceiving(); await revealed; } };
        }

        if (p.variant === "battle") {
          /* ============ VERSUS SLAM — story→duel ============ */
          beat("FACE-OFF");
          const vs = p.payload?.vs;
          const ln = (vs?.ln ?? "YOU").toUpperCase();
          const rn = (vs?.rn ?? "DUEL").toUpperCase();
          host.innerHTML = `
            <div class="n4pnl n4pL"><div class="n4fill n4htw"></div>
             <div class="n4pghost n4a" style="left:-4vw;top:-12vh;color:rgba(255,255,255,.06)">${ln}</div>
             <div class="n4ptag" style="left:6vw;top:16vh;background:var(--red)">CHALLENGER</div>
             <div class="n4pnm n4a" style="left:5vw;top:22vh;color:#fff;text-shadow:1.2vh 1.2vh 0 var(--red)">${ln}</div>
             <div class="n4ptag n4e" style="left:6vw;top:44vh;background:#fff;color:#000">7 CARDS · 3 TRICKS MAX</div>
            </div>
            <div class="n4pnl n4pR"><div class="n4fill n4ht"></div>
             <div class="n4pghost n4a" style="right:-6vw;bottom:-14vh;color:rgba(0,0,0,.18)">${rn}</div>
             <div class="n4ptag" style="right:6vw;top:52vh;background:#000">${(vs?.rt ?? "TARGET").toUpperCase()}</div>
             <div class="n4pnm n4a" style="right:5vw;top:58vh;color:#000;text-shadow:1.2vh 1.2vh 0 #fff">${rn}</div>
             <div class="n4ptag n4e" style="right:6vw;top:80vh;background:#fff;color:#000">SEAT OF THE TARGET</div>
            </div>
            <div class="n4speed" id="n4vspeed"></div>
            <div class="n4vs n4a"><span style="background:#fff;color:#000">V</span><span style="background:#0b0b0b;color:var(--red);transform:rotate(6deg)">S</span></div>
            <div class="n4bsub n4e">ROUND 1 OF 7 &nbsp;·&nbsp; <b>CLIMAX AT R7 ×2</b> &nbsp;·&nbsp; SHIELDS UP</div>
            <div class="n4stamp n4a">DUEL!</div>
            <div class="n4ring"></div><div class="n4ring n4w"></div>
            <div class="n4flash"></div>`;
          const C = p.coveredMs, hold = p.revealAtMs - C, D = p.revealMs;
          A(".n4pL", [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }], 0, Math.round(C * 0.86), EASE.snap);
          A(".n4pR", [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], 40, Math.round(C * 0.86), EASE.snap);
          at(C, commitCover);
          flashAt(C, 160, 0.75); shake(host.querySelector(".n4pnl") ?? host, C, 180);
          A("#n4vspeed", [{ transform: "translateX(5vw)", opacity: 0 }, { opacity: 0.45, offset: 0.15 },
            { opacity: 0.4, offset: 0.85 }, { transform: "translateX(-5vw)", opacity: 0 }], C, hold, EASE.lin);
          Array.from(host.querySelectorAll(".n4vs span")).forEach((s, i) => {
            const b = (s as HTMLElement).style.transform || "";
            A(s, [{ transform: `${b} scale(3.4)`, opacity: 0 }, { transform: `${b} scale(.9)`, opacity: 1, offset: 0.65 },
              { transform: `${b} scale(1)`, opacity: 1 }], C + 40 + i * 60, 220, EASE.snap);
          });
          A(".n4bsub", [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], C + 180, 260, EASE.snap);
          receiving = () => {
            if (torn) return;
            sound(transitionCues(p).reveal, "reveal");
            beat("BREAK + STAMP");
            host.style.background = "transparent"; // panels break away over the live duel
            A(".n4vs span", [{ opacity: 1 }, { opacity: 0 }], 0, 180, EASE.in, "forwards");
            A(".n4bsub", [{ opacity: 1 }, { opacity: 0 }], 0, 180, EASE.lin, "forwards");
            A(".n4pL", [{ transform: "translate(0,0)" }, { transform: "translate(-70vw,-25vh) rotate(-4deg)" }], 0, 450, EASE.in, "forwards");
            A(".n4pR", [{ transform: "translate(0,0)" }, { transform: "translate(70vw,25vh) rotate(-4deg)" }], 0, 450, EASE.in, "forwards");
            A(".n4stamp", [{ transform: "translate(-50%,-50%) rotate(-24deg) scale(3)", opacity: 0 },
              { transform: "translate(-50%,-50%) rotate(-10deg) scale(.92)", opacity: 1, offset: 0.6 },
              { transform: "translate(-50%,-50%) rotate(-10deg) scale(1)", opacity: 1 }], 60, 260, EASE.snap);
            A(".n4stamp", [{ transform: "translate(-50%,-50%) rotate(-10deg) scale(1)", opacity: 1 },
              { transform: "translate(-50%,-50%) rotate(-10deg) scale(1.25)", opacity: 0 }], D - 260, 260, EASE.in, "forwards");
            rings(".n4ring", 60, parallelDuration(460, D), 80);
            at(D, teardown);
          };
          sound(transitionCues(p).entrance);
          return { covered, reveal: async () => { startReceiving(); await revealed; } };
        }

        /* ============ HEIST TAKEOVER — full + compact ============ */
        const word = wordFor(p);
        const tierFull = p.tier === "full";
        const C = p.coveredMs, R = p.revealAtMs, D = p.revealMs, B = p.bladeAtMs ?? R;
        beat("LOCK-ON");
        host.innerHTML = `
          <div class="n4scan"></div>
          <div class="n4claw" style="top:22vh"></div><div class="n4claw" style="top:40vh"></div><div class="n4claw" style="top:58vh"></div>
          <div class="n4ret"><i></i><i></i><i></i><i></i><span>TARGET LOCKED</span></div>
          <div class="n4half n4hold">${sheetHTML(p.tier, word)}</div>
          <div class="n4cut n4hA"></div><div class="n4cut n4hB"></div>
          <div class="n4blade" id="n4bF"></div>
          <div class="n4ring"></div><div class="n4ring n4w"></div>
          ${shardsHTML(p.tier)}
          <div class="n4flash"></div>`;
        const slabLen = Math.round(C * 0.51);
        // 1. LOCK-ON — scan sweeps, reticle snaps, claws rake over a still page.
        A(".n4scan", [{ transform: "translateY(-20vh)", opacity: 1 }, { transform: "translateY(105vh)", opacity: 1 }],
          0, Math.round(C * 0.57), EASE.in);
        A(".n4ret", [{ transform: "scale(2.4) rotate(45deg)", opacity: 0 }, { transform: "scale(1) rotate(0)", opacity: 1, offset: 0.7 },
          { transform: "scale(.92)", opacity: 1 }], 0, Math.round(C * 0.32), EASE.snap);
        A(".n4ret", [{ opacity: 1 }, { opacity: 0 }], C * 0.4 + 80, 120, EASE.lin, "forwards");
        Array.from(host.querySelectorAll(".n4claw")).forEach((c, i) =>
          A(c, [{ transform: `rotate(-18deg) translateX(${i % 2 ? "" : "-"}110%)`, opacity: 1 },
            { transform: "rotate(-18deg) translateX(0)", opacity: 1 }], 40 + i * 32, tierFull ? 260 : 200, EASE.snap));
        // 2. SLAB AVALANCHE — four compact or six full marquee bands.
        at(Math.round(C * 0.22), () => beat("SLAB AVALANCHE"));
        Array.from(host.querySelectorAll(".n4slab")).forEach((el, i) => {
          const dir = i % 2 ? 1 : -1;
          A(el, [{ transform: `translateX(${dir * 85}%) rotate(-9deg) scaleY(.6)` }, { transform: "translateX(0) rotate(-9deg) scaleY(1)" }],
            Math.round(C * 0.22) + i * 28, slabLen, EASE.slam);
          A(el.querySelector(".n4mq") as Element, [{ transform: `translateX(${i % 2 ? -20 : 0}%)` }, { transform: `translateX(${i % 2 ? 0 : -20}%)` }],
            Math.round(C * 0.22), B - Math.round(C * 0.22), EASE.lin);
        });
        A('[data-k="sbg"]', [{ opacity: 0 }, { opacity: 1 }], Math.round(C * 0.65), Math.round(C * 0.3), EASE.lin);
        // 3. COVER — the only route-swap point. The destination stays still.
        at(C, commitCover);
        const coverShake = host.querySelector(".n4hold");
        if (coverShake) shake(coverShake, C, 170);
        // 4. HOLD — no name drop; the slabs stay put and their marquees keep
        //    rolling until the cut (the .n4mq scroll above runs to B).
        at(C + 20, () => beat("HOLD / MARQUEE"));
        // 5/6. THE CUT + SPLIT — both start only when the receiving page is visible.
        receiving = () => {
          if (torn) return;
          sound(transitionCues(p).reveal, "reveal");
          beat("THE CUT");
          host.style.background = "transparent"; // the split opens over the committed page, not the black stage
          host.querySelectorAll(".n4slab").forEach((el) => el.remove());
          const bEl = host.querySelector("#n4bF") as HTMLElement;
          const W = window.innerWidth, H = window.innerHeight;
          const blen = Math.hypot(W, 0.24 * H), ang = Math.atan2(-0.24 * H, W) * 180 / Math.PI;
          bEl.style.width = `${blen}px`; bEl.style.top = `${0.64 * H}px`;
          host.querySelectorAll<HTMLElement>(".n4cut").forEach((el) => { el.style.visibility = "visible"; });
          A(bEl, [{ transform: `rotate(${ang}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1 }],
            0, 120, EASE.snap);
          A(bEl, [{ opacity: 1 }, { opacity: 0 }], R - B + 80, 140, EASE.lin, "forwards");
          A(".n4hold", [{ transform: "translate(0,0)" }, { transform: "translate(-1.4vw,-.8vh)" }], 0, 100, EASE.out, "forwards");
          A(".n4cut", [{ transform: "translate(0,0)" }, { transform: "translate(-.6vw,-.4vh)" }], 0, 100, EASE.out, "forwards");
          const delay = R - B;
          at(delay, () => {
            if (torn) return;
            beat("SPLIT REVEAL");
            const sheet = host.querySelector(".n4hold") as HTMLElement | null;
            // Once the same-color covers meet under the blade, hide the full art,
            // keeping its layout box stable for any filling entrance animation.
            if (sheet) sheet.style.visibility = "hidden";
            const splitLen = Math.min(450, D - delay);
            A(".n4hA", [{ transform: "translate(-.6vw,-.4vh) rotate(0)" }, { transform: "translate(-22vw,-80vh) rotate(-7deg)" }],
              0, splitLen, EASE.out, "forwards");
            A(".n4hB", [{ transform: "translate(-.6vw,-.4vh) rotate(0)" }, { transform: "translate(22vw,80vh) rotate(-7deg)" }],
              0, splitLen, EASE.out, "forwards");
            Array.from(host.querySelectorAll(".n4shard")).forEach((s, i) => {
              const a = rnd(0, Math.PI * 2), d = rnd(25, 55), rr = rnd(-300, 300), sc = rnd(0.5, 1.2);
              A(s, [{ transform: `translate(-50%,-50%) scale(${sc})`, opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d}vw),calc(-50% + ${Math.sin(a) * d}vh)) rotate(${rr}deg) scale(${sc * 0.3})`, opacity: 0 }],
                i * 4, splitLen, EASE.out, "forwards");
            });
            rings(".n4ring", 0, Math.min(480, splitLen + 50), 70);
          });
          flashAt(delay, 140, 0.45);
          at(D, teardown);
        };
        sound(transitionCues(p).entrance);
        return { covered, reveal: async () => { startReceiving(); await revealed; } };
      },
    });
    return () => setNavTransitionController(null);
  }, []);

  return <div ref={hostRef} className="navt" style={{ display: "none" }} />;
}

function parallelDuration(duration: number, limit: number): number {
  return Math.min(duration, limit);
}
