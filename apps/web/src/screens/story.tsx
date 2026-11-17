import { IonPage, useIonViewWillEnter, useIonViewWillLeave } from "@ionic/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { navigationInProgress, router } from "../lib/nav";
import { playClick, playHover } from "../lib/sfx";
import { playVoice, prefetchVoice, type VoiceHandle } from "../lib/voice";
import { useVoiceUnlock } from "../lib/useVoiceUnlock";
import { kleinPlayerScene, studentPortraits, type EncounterScene, type EpilogueScene, type KleinPose, type KleinReplyChoice, type KleinScene, type SceneLine } from "../lib/encounter";
import { refusalScene, rosterStudent } from "../data/roster";
import s from "./story.module.css";

const DESIGN_W = 1600;
const DESIGN_H = 900;
const TYPE_MS = 32;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function bubblePath(w: number, h: number) {
  const rnd = (i: number) => {
    let x = (i * 668265263 + 987654321) | 0;
    x = (x ^ (x >>> 13)) * 1274126177;
    return (((x ^ (x >>> 16)) >>> 0) % 1000) / 1000;
  };
  const j = (i: number, amp: number) => (rnd(i) - 0.5) * amp;
  const pts: string[] = [];
  const P = (x: number, y: number) => pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  P(26, 10 + j(0, 6));
  for (let x = 96, i = 1; x < w - 40; x += 72, i++) P(x, 8 + j(i, 7));
  P(w - 14, 22 + j(20, 5));
  for (let y = 58, i = 21; y < h - 34; y += 44, i++) P(w - 10 + j(i, 6), y);
  P(w - 26, h - 12 + j(30, 5));
  for (let x = w - 98, i = 31; x > 40; x -= 72, i++) P(x, h - 9 + j(i, 7));
  P(14, h - 26 + j(40, 5));
  P(12, h - 44);
  P(-34, h - 54);
  P(-10, h - 62);
  P(-30, h - 78);
  P(14, h - 84);
  for (let y = h - 110, i = 41; y > 30; y -= 44, i++) P(10 + j(i, 6), y);
  P(18, 18 + j(50, 5));
  return `M ${pts.join(" L ")} Z`;
}

function BubbleArt() {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 840, h: 132 });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = size;
  return (
    <div ref={host} className={s.bubbleArtHost} aria-hidden>
      <svg className={s.bubbleArt} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={bubblePath(w, h)} fill="#050505" stroke="#fff" strokeWidth={6} strokeLinejoin="miter" />
      </svg>
    </div>
  );
}

function useWindowDimensions() {
  const [d, setD] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const on = () => setD({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return d;
}

export default function Story() {
  const [sp] = useSearchParams();
  const encounterId = sp.get("encounter") ?? "";
  const epilogueMode = sp.get("after") === "1";
  // Seat this story belongs to: carried on the challenge URL (encounter flow) or
  // the query param (refusal flow). Names and portraits come from the roster.
  const studentParam = Number(sp.get("student")) || 1;
  const storyName = rosterStudent(studentParam)?.name ?? "KLEIN";
  // Refusal gate — /story?student=N (no encounter): an unfinished seat turns the
  // challenge down in person. Fully local scene: no server encounter, no voice.
  const refusalStudent = encounterId ? null : rosterStudent(Number(sp.get("student")) || 0);
  const refusalMode = !!refusalStudent;
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
  // a session-restored visit has no login gesture — retry any line gated before unlock
  const voiceUnlockTick = useVoiceUnlock();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [scene, setScene] = useState<KleinScene | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [starting, setStarting] = useState(false);
  const [reply, setReply] = useState<{ choice: KleinReplyChoice; response?: KleinReplyChoice["response"] } | null>(null);
  const [replying, setReplying] = useState(false);
  const alive = useRef(true);
  const readSent = useRef(0);
  const startingRef = useRef(false);
  const replyingRef = useRef(false);
  const [viewActive, setViewActive] = useState(true);
  const [navReady, setNavReady] = useState(!navigationInProgress());
  const speech = useRef<VoiceHandle | null>(null);
  const prefetch = useRef<VoiceHandle | null>(null);
  const spokenLine = useRef("");
  const exitingRef = useRef(false);
  // one guarded exit — a second click/Space during the shutter must not queue
  // another navigation (which previously replayed the whole heist again)
  const exitToCampaign = useCallback(() => {
    if (exitingRef.current || navigationInProgress()) return;
    exitingRef.current = true;
    playClick();
    router.replace("/campaign", { back: true });
  }, []);

  const cancelSpeech = useCallback(() => {
    speech.current?.cancel();
    speech.current = null;
    prefetch.current?.cancel();
    prefetch.current = null;
  }, []);

  useIonViewWillEnter(() => { setViewActive(true); setNavReady(!navigationInProgress()); }, []);
  useIonViewWillLeave(() => { setViewActive(false); cancelSpeech(); }, [cancelSpeech]);

  useEffect(() => {
    alive.current = true;
    for (const src of Object.values(studentPortraits(studentParam))) { const img = new window.Image(); img.src = src; }
    const leaving = () => { setNavReady(false); cancelSpeech(); };
    const settled = () => setNavReady(true);
    window.addEventListener("pacify:nav-start", leaving);
    window.addEventListener("pacify:nav-settled", settled);
    return () => {
      alive.current = false;
      cancelSpeech();
      window.removeEventListener("pacify:nav-start", leaving);
      window.removeEventListener("pacify:nav-settled", settled);
    };
  }, [cancelSpeech]);

  const load = useCallback(async () => {
    if (!encounterId && refusalStudent) {
      // refusal scene — local content + one cheap read so the lines can flex on
      // whether the player has actually beaten anyone yet
      setStatus("loading");
      if (refusalStudent.portrait) { const img = new window.Image(); img.src = refusalStudent.portrait; }
      const [beat, camp] = await Promise.all([
        sleep(650),
        api<{ clearedCount: number }>("/campaign").catch(() => null),
      ]);
      void beat;
      if (!alive.current) return;
      setScene(refusalScene(refusalStudent, (camp?.clearedCount ?? 0) > 0));
      setLineIdx(0);
      setChars(0);
      setReply(null);
      readSent.current = 0;
      setStatus("ready");
      return;
    }
    if (!encounterId) { router.replace("/campaign"); return; }
    setStatus("loading");
    // A slow scene generation is normal (LLM, seconds on a fresh encounter) — the
    // rolling card waits as long as needed. The guard only catches a truly hung
    // server so the wait can never strand silently; RETRY recovers from there.
    const gen = new AbortController();
    const guard = setTimeout(() => gen.abort(), 90000);
    // the loading beat always reads, even when the scene comes back instantly
    const beat = sleep(650);
    try {
      if (epilogueMode) {
        const [data] = await Promise.all([
          api<EpilogueScene>(`/campaign/encounters/${encounterId}/epilogue`, undefined, gen.signal),
          beat,
        ]);
        if (!alive.current) return;
        if (!data.epilogue) { router.replace("/campaign"); return; }
        setScene(data.epilogue);
        setLineIdx(0);
        setChars(0);
        readSent.current = 0;
        setStatus("ready");
        return;
      }
      const [data] = await Promise.all([
        api<EncounterScene>("/campaign/encounters", { id: encounterId, studentId: studentParam }, gen.signal),
        beat,
      ]);
      if (!alive.current) return;
      if (data.completed) { router.replace("/campaign"); return; }
      if (data.started) { router.replace(`/duel?encounter=${encounterId}`, { vs: { ln: "YOU", lt: "7 CARDS · 3 TRICKS MAX", rn: storyName, rt: `TARGET ${String(studentParam).padStart(2, "0")}` } }); return; }
      if (!data.scene) { setErrMsg("SCENE MISSING"); setStatus("error"); return; }
      setScene(kleinPlayerScene(data.scene));
      setLineIdx(0);
      setChars(0);
      setReply(null);
      readSent.current = 0;
      setStatus("ready");
    } catch (e: any) {
      if (!alive.current) return;
      if (String(e?.message).includes("NOT LOGGED IN")) { router.replace("/login"); return; }
      setErrMsg(e?.name === "AbortError" ? "REQUEST TIMED OUT" : e?.message ?? "REQUEST FAILED");
      setStatus("error");
    } finally {
      clearTimeout(guard);
    }
  }, [encounterId, epilogueMode, refusalStudent]);

  useEffect(() => { void load(); }, [load]);

  // Lines on screen = the authored scene, plus Klein's scripted reply once the
  // player has answered the exchange.
  const lines: SceneLine[] = [...(scene?.lines ?? [])];
  if (reply) {
    const spoken = reply.response ?? reply.choice.response;
    lines.push(spoken);
  }
  const exchange = epilogueMode || reply ? undefined : scene?.exchange?.choices;
  const line = lines[lineIdx];
  const full = line?.text ?? "";
  const done = chars >= full.length;
  const atLastLine = lineIdx + 1 >= lines.length;
  const ticket = line?.voiceTicket;
  const nextTicket = scene?.lines[lineIdx + 1]?.voiceTicket;

  useEffect(() => {
    if (status !== "ready" || !viewActive || !navReady || starting || replying || !ticket) return;
    const identity = `${encounterId}:${epilogueMode}:${lineIdx}:${ticket}:${voiceUnlockTick}`;
    if (spokenLine.current === identity) return;
    spokenLine.current = identity;
    let current = true;
    // The player makes the full matching line paint before audio samples begin.
    speech.current = playVoice(ticket, {
      onBeforePlay: () => { if (current) setChars(full.length); },
      onError: (err) => console.warn("[voice] playback failed", err),
    });
    return () => { current = false; speech.current?.cancel(); speech.current = null; };
  }, [status, viewActive, navReady, starting, replying, ticket, encounterId, epilogueMode, lineIdx, full, voiceUnlockTick]);

  useEffect(() => {
    // playVoice can adopt the previous next-line prefetch before its handle is
    // discarded. Never prefetch an unselected reply choice.
    prefetch.current?.cancel();
    prefetch.current = null;
    if (status === "ready" && viewActive && navReady && !starting && !replying && nextTicket) {
      prefetch.current = prefetchVoice(nextTicket);
    }
  }, [status, viewActive, navReady, starting, replying, nextTicket, lineIdx, voiceUnlockTick]);

  useEffect(() => {
    if (status !== "ready" || !line || done) return;
    const iv = setInterval(() => setChars((c) => Math.min(c + 1, full.length)), TYPE_MS);
    return () => clearInterval(iv);
  }, [status, lineIdx, done, full.length, line]);

  const acknowledge = useCallback((count: number) => {
    if (count <= readSent.current) return;
    readSent.current = count;
    void api(epilogueMode
      ? `/campaign/encounters/${encounterId}/epilogue/read`
      : `/campaign/encounters/${encounterId}/read`, { readCount: count }).catch(() => {});
  }, [encounterId, epilogueMode]);

  useEffect(() => {
    if (refusalMode) return; // local scene — nothing to acknowledge server-side
    // Klein's scripted reply-exchange response is display-only flavor: it never
    // counts toward the server-validated readCount (authored scene lines only).
    if (status === "ready" && done && line) acknowledge(Math.min(lineIdx + 1, scene?.lines.length ?? 0));
  }, [status, done, line, lineIdx, acknowledge, scene, refusalMode]);

  const pickReply = useCallback(async (choice: KleinReplyChoice) => {
    if (replyingRef.current) return;
    cancelSpeech();
    replyingRef.current = true;
    setReplying(true);
    playClick();
    try {
      // The server owns the exchange: the first reply sticks, so the authoritative
      // response comes back from it (identical on first pick, first choice on replay).
      const data = await api<{ response: KleinReplyChoice["response"] }>(
        `/campaign/encounters/${encounterId}/reply`, { choiceId: choice.id });
      if (alive.current) setReply({ choice, response: data.response });
    } catch {
      // A failed reply must never trap the player: continue without the exchange.
      if (alive.current) setScene((current) => current ? { chapter: current.chapter, lines: current.lines } : current);
    } finally {
      replyingRef.current = false;
      setReplying(false);
    }
  }, [encounterId, cancelSpeech]);

  const startDuel = useCallback(async () => {
    if (startingRef.current || epilogueMode || refusalMode) return;
    cancelSpeech();
    startingRef.current = true;
    setStarting(true);
    playClick();
    try {
      await api(`/campaign/encounters/${encounterId}/start`, { readCount: readSent.current });
      if (alive.current) router.replace(`/duel?encounter=${encounterId}`, { vs: { ln: "YOU", lt: "7 CARDS · 3 TRICKS MAX", rn: storyName, rt: `TARGET ${String(studentParam).padStart(2, "0")}` } });
    } catch (e: any) {
      if (!alive.current) return;
      startingRef.current = false;
      setStarting(false);
      setErrMsg(e?.message ?? "REQUEST FAILED");
      setStatus("error");
    }
  }, [encounterId, epilogueMode, cancelSpeech, refusalMode]);

  const advance = useCallback(() => {
    if (status !== "ready" || !navReady || !scene || starting || startingRef.current || replying || replyingRef.current) return;
    if (!done) { setChars(full.length); return; }
    if (atLastLine && exchange) return; // the player must answer the exchange
    playClick();
    if (atLastLine) {
      // epilogue and refusal scenes end the visit — the seat keeps its pride
      if (epilogueMode || refusalMode) { exitToCampaign(); return; }
      void startDuel();
      return;
    }
    speech.current?.cancel();
    speech.current = null;
    setLineIdx((i) => i + 1);
    setChars(0);
  }, [status, navReady, scene, starting, replying, done, full.length, atLastLine, exchange, lineIdx, epilogueMode, refusalMode, startDuel, exitToCampaign]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); advance(); }
      else if (e.code === "Escape" && status === "ready" && !epilogueMode && !refusalMode) { e.preventDefault(); void startDuel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, startDuel, status, epilogueMode, refusalMode]);

  const pose: KleinPose = line?.pose ?? "neutral";
  const chapterLabel = epilogueMode ? "AFTER THE DUEL" : refusalMode ? "REFUSED" : scene?.chapter ?? "";

  return (
    <IonPage>
      <div className={`v ${s.viewport} ${status === "ready" ? s.viewportReady : ""}`} onClick={advance}>
        <div className={`v ${s.stage}`} style={{ transform: `scale(${scale})` }}>
          <div className={`v ${s.stripes}`} />
          <div className={`v ${s.dots}`} />
          <div className={`v ${s.vignette}`} />

          {status === "ready" && scene && (
            <>
              <div className={`v ${s.chapterWrap}`}>
                <div className={`v ${s.chapterBar}`} />
                <div className={`t ${s.chapterTxt}`}>{epilogueMode ? chapterLabel : refusalMode ? "CH.?? — REFUSED" : `CH.01 — ${chapterLabel.toUpperCase()}`}</div>
              </div>

              <div className={`v ${s.portraitWrap}`}>
                {refusalStudent ? (
                  <div className={`v ${s.portrait}`} style={{ backgroundImage: refusalStudent.portrait ? `url("${refusalStudent.portrait}")` : undefined, opacity: 1 }} />
                ) : (
                  Object.entries(studentPortraits(studentParam)).map(([p, src]) => (
                    <div key={p} className={`v ${s.portrait}`} style={{ backgroundImage: `url("${src}")`, opacity: p === pose ? 1 : 0 }} />
                  ))
                )}
              </div>

              <div className={`v ${s.dialogueHit} press`} data-testid="story-advance">
                {exchange && done && atLastLine && !replying && (
                  <div className={`v ${s.choices}`} data-testid="reply-choices" onClick={(e) => e.stopPropagation()}>
                    <div className={`v ${s.choicesLabel}`}><div className={`t ${s.choicesLabelTxt}`}>YOUR RESPONSE</div></div>
                    {exchange.map((choice, i) => (
                      <div key={choice.id} className={`v ${s.choiceBtn} press`} onMouseEnter={playHover}
                        onClick={() => void pickReply(choice)} data-testid={`reply-${choice.id}`}
                        role="button" tabIndex={0} aria-label={`Reply: ${choice.text}`}
                        onKeyDown={(e) => {
                          if (e.code === "Enter" || e.code === "Space") {
                            e.preventDefault();
                            e.stopPropagation();
                            void pickReply(choice);
                          }
                        }}
                        style={{ zIndex: exchange.length - i, transform: `rotate(${i === 0 ? 1.5 : i === 1 ? -1 : 1}deg) translateX(${i % 2 ? -22 : 0}px)` }}>
                        <div className={`v ${s.choiceEdge}`} aria-hidden />
                        <div className={`v ${s.choiceInner}`}>
                          <div className={`t ${s.choiceMark}`} aria-hidden>▶</div>
                          <div className={`t ${s.choiceTxt}`}>{choice.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <BubbleArt />
                <div className={`v ${s.dialogueContent}`}>
                  <div className={`t ${s.dialogueTxt}`} data-testid="story-text">
                    {full.slice(0, chars)}
                    {!done && <span className={s.caret}>▍</span>}
                  </div>
                  {exchange && done && atLastLine && !replying && (
                    <div className={`t ${s.replyHint}`}>CHOOSE A RESPONSE ABOVE</div>
                  )}
                </div>
                <div className={`v ${s.nameTag}`}>
                  <div className={`t ${s.nameTxt}`}>{refusalStudent ? refusalStudent.name : storyName}</div>
                </div>
                {lines.length > 1 && !(exchange && done && atLastLine) && (
                  <div className={`t ${s.lineCount}`}>
                    {String(lineIdx + 1).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}
                  </div>
                )}
                {done && !exchange && <div className={`t ${s.nextArrow}`}>▶</div>}
              </div>

              <div className={`v ${s.controls} ${exchange ? s.controlsWithChoices : ""}`} onClick={(e) => e.stopPropagation()}>
                {!epilogueMode && !refusalMode && (
                  <div className={`v ${s.skipBtn} press`} onMouseEnter={playHover} onClick={() => void startDuel()} data-testid="story-skip">
                    <div className={`t ${s.skipTxt}`}>SKIP ▶▶</div>
                  </div>
                )}
                {refusalMode && (
                  <div className={`v ${s.skipBtn} press`} onMouseEnter={playHover} onClick={exitToCampaign} data-testid="story-leave">
                    <div className={`t ${s.skipTxt}`}>LEAVE ▶</div>
                  </div>
                )}
                <div className={`t ${s.hintTxt}`}>CLICK ANYWHERE / SPACE</div>
              </div>

              {/* AI in flight — the line/duel start waits for the server, and the
                  wait is visible instead of a silent freeze (input is already blocked). */}
              {(starting || replying) && (
                <div className={`v ${s.centerWrap}`}>
                  <div className={`t ${s.loadingTxt}`}
                    style={{ background: "#000", padding: "10px 26px", boxShadow: "3px 3px 0 #E60012", animation: "p5-blinkHard 1.1s ease-in-out infinite" }}>
                    {starting ? `${storyName} TAKES A SEAT…` : `${storyName} IS THINKING…`}
                  </div>
                </div>
              )}
            </>
          )}

          {status === "loading" && (
            <div className={`v ${s.centerWrap}`}>
              <div className={`v ${s.loadingCardWrap}`}>
                <div className={`v ${s.loadingCard}`} />
              </div>
              <div className={`t ${s.loadingTxt}`}>
                {refusalMode ? "A SEAT NOTICES YOU…" : epilogueMode ? `${storyName} IS PUTTING THE TABLE AWAY` : `${storyName} IS SETTING THE TABLE`}
              </div>
              <div className={`v ${s.loadingDots}`}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`v ${s.loadingDot}`} style={{ animation: `storyDotBounce 0.9s ${i * 150}ms ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className={`v ${s.centerWrap}`}>
              <div className={`t ${s.errorTxt}`}>SIGNAL LOST — {errMsg}</div>
              <div className={`v ${s.errorBtns}`}>
                <div className={`v ${s.retryBtn} press`} onMouseEnter={playHover} onClick={() => void load()}>
                  <div className={`t ${s.retryTxt}`}>RETRY ▶</div>
                </div>
                <div className={`v ${s.backBtn} press`} onMouseEnter={playHover} onClick={exitToCampaign}>
                  <div className={`t ${s.backTxt}`}>CAMPAIGN</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </IonPage>
  );
}
