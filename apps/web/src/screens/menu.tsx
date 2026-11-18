import { IonPage } from "@ionic/react";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { theme } from "../theme/tokens";
import { playHover, playClick, play } from "../lib/sfx";
import { router } from "../lib/nav";
import { VICTOR_MENU_INVITE, VICTOR_PORTRAITS, type VictorPose } from "../data/victor";
import { playVictorClip, type VictorPlayHandle } from "../lib/victor-voice";
import { appendTutorialLog, loadTutorialLog, type TutorialLogEntry } from "../lib/tutorial-log";
import { BubbleArt } from "./tutorial";
import td from "./tutorial-duel.module.css";
import tut from "./tutorial.module.css";
import tTrick from "./tutorial-tricks.module.css";
import mi from "./menu-invite.module.css";
import s from "./menu.module.css";

/* landscape-phone (short viewport) — the nav list compacts so all 7 rows fit */
function useShortViewport() {
  const [short, setShort] = useState(() => window.innerHeight < 560);
  useEffect(() => {
    const on = () => setShort(window.innerHeight < 560);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return short;
}

const NAV = [
  { n: "01", label: "CAMPAIGN", sub: "13 students to beat", to: "/campaign" },
  { n: "02", label: "DOSSIER", sub: "13 Seats Secret Files", to: "/dossier" },
  { n: "03", label: "HALL OF SHAME", sub: "Dont be listed here", to: "/shame" },
  { n: "04", label: "MULTIPLAYER", sub: "", to: null },
  { n: "05", label: "PROFILE", sub: "stats • records", to: "/profile" },
  { n: "06", label: "HOW TO PLAY", sub: "the briefing ▶", to: "/howto" },
  { n: "07", label: "OPTIONS", sub: "sound • display", to: "/options" },
];

/* hidden lore word — the boxed letter on each row reads top-to-bottom */
const BOX_INDEX: Record<string, number> = {
  CAMPAIGN: 3, // P
  DOSSIER: 4, // I
  "HALL OF SHAME": 8, // S
  MULTIPLAYER: 3, // T
  PROFILE: 2, // O
  "HOW TO PLAY": 8, // L
  OPTIONS: 6, // S
};

type SpotRect = { x: number; y: number; w: number; h: number };

/* ransom-note typography: every letter tilted its own way, one letter inverted */
function Ransom({ text, size, dim, box }: { text: string; size: number; dim?: boolean; box?: number }) {
  return (
    <>
      {text.split("").map((ch, i) => {
        const flip = box !== undefined && i === box;
        const tilt = (i % 3) - 1;
        return (
          <div
            key={i}
            className={`t ${s.ransomLetter}`}
            style={{
              fontSize: i % 2 ? size * 1.08 : size,
              transform: `rotate(${tilt * 3}deg) translateY(${tilt * size * 0.05}px)`,
              ...(dim && !flip ? { color: "#8f8f8f" } : null),
              ...(flip
                ? {
                    backgroundColor: dim ? "#5a5a5a" : theme.color.crimson,
                    color: theme.color.paper,
                    paddingLeft: 4,
                    paddingRight: 4,
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.55)",
                    marginLeft: 2,
                    marginRight: 2,
                  }
                : null),
            }}
          >
            {ch}
          </div>
        );
      })}
    </>
  );
}

export default function Menu() {
  return <DesignJ />;
}

/* ========== DESIGN J — GAZE LINE (authentic P5: white central line guides the eye) ========== */
function DesignJ() {
  const short = useShortViewport();

  /* ---------- MENU INVITATION — Victor's last orientation beat ---------- */
  const inviteRequested = useMemo(
    () => new URLSearchParams(window.location.search).get("tutorial") === "invite",
    [],
  );
  const [inviteLive, setInviteLive] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);
  // Ionic's outlet keeps the menu page mounted after it navigates away — the
  // invitation must be bound to the route so it can never ride on top of
  // whatever screen comes next.
  const { pathname } = useLocation();
  const invite =
    inviteRequested &&
    pathname === "/menu" &&
    !inviteDone &&
    !sessionStorage.getItem("pacify_tutorial_done");
  const [inviteNavReady, setInviteNavReady] = useState(false);
  const [inviteChars, setInviteChars] = useState(0);
  const [inviteLogOpen, setInviteLogOpen] = useState(false);
  const [inviteHistory, setInviteHistory] = useState<TutorialLogEntry[]>(() => loadTutorialLog());
  const [inviteSpot, setInviteSpot] = useState<{ real: SpotRect; design: SpotRect } | null>(null);
  const inviteVoiceRef = useRef<VictorPlayHandle | null>(null);
  const campaignRowRef = useRef<HTMLDivElement | null>(null);
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });
  const inviteFull = VICTOR_MENU_INVITE.text;
  const inviteDoneTxt = inviteChars >= inviteFull.length;

  useEffect(() => {
    const on = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // leaving the route drops the invitation along with its voice
  useEffect(() => {
    if (pathname === "/menu") return;
    setInviteLive(false);
    setInviteLogOpen(false);
    inviteVoiceRef.current?.cancel();
    inviteVoiceRef.current = null;
  }, [pathname]);
  const inviteScale = Math.min(1, win.w / 1600, win.h / 900);
  const inviteScaleRef = useRef(inviteScale);
  inviteScaleRef.current = inviteScale;

  // the line waits for the shutter retreat to land (direct loads get a fallback)
  useEffect(() => {
    const leaving = () => setInviteNavReady(false);
    const settled = () => setInviteNavReady(true);
    window.addEventListener("pacify:nav-start", leaving);
    window.addEventListener("pacify:nav-settled", settled);
    const t = setTimeout(() => setInviteNavReady(true), 1500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pacify:nav-start", leaving);
      window.removeEventListener("pacify:nav-settled", settled);
      inviteVoiceRef.current?.cancel();
      inviteVoiceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (invite && inviteNavReady) setInviteLive(true);
  }, [invite, inviteNavReady]);

  // the spoken invitation — same playback contract as every other tutorial line
  useEffect(() => {
    if (!inviteLive || !inviteNavReady || inviteLogOpen) { setInviteChars(0); return; }
    setInviteChars(0);
    play("duel.bubble");
    setInviteHistory(appendTutorialLog({ id: VICTOR_MENU_INVITE.id, speaker: "VICTOR", text: inviteFull }));
    let aliveLine = true;
    const voice = playVictorClip(VICTOR_MENU_INVITE.audio, {
      onPlaying: () => { if (aliveLine) setInviteChars(inviteFull.length); },
    });
    inviteVoiceRef.current = voice;
    const iv = setInterval(() => setInviteChars((c) => Math.min(c + 1, inviteFull.length)), 26);
    return () => {
      aliveLine = false;
      clearInterval(iv);
      voice.cancel();
      if (inviteVoiceRef.current === voice) inviteVoiceRef.current = null;
    };
  }, [inviteLive, inviteNavReady, inviteLogOpen, inviteFull]);

  // spotlight hole over the CAMPAIGN row — real coords for the full-screen dim,
  // plane coords for the invisible click catcher that rides inside the plane
  useEffect(() => {
    if (!inviteLive) return;
    const measure = () => {
      const row = campaignRowRef.current;
      if (!row) return;
      const sc = inviteScaleRef.current;
      const r = row.getBoundingClientRect();
      const left = window.innerWidth / 2 - 800 * sc;
      const top = window.innerHeight / 2 - 450 * sc;
      setInviteSpot({
        real: { x: r.left - 26, y: r.top - 30, w: r.width + 52, h: r.height + 60 },
        design: {
          x: (r.left - left) / sc - 26,
          y: (r.top - top) / sc - 30,
          w: r.width / sc + 52,
          h: r.height / sc + 60,
        },
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [inviteLive, win]);

  const openInviteLog = useCallback(() => {
    if (inviteLogOpen) return;
    playClick();
    inviteVoiceRef.current?.cancel();
    inviteVoiceRef.current = null;
    setInviteLogOpen(true);
  }, [inviteLogOpen]);
  const closeInviteLog = useCallback(() => {
    if (!inviteLogOpen) return;
    playClick();
    setInviteLogOpen(false);
  }, [inviteLogOpen]);

  const goCampaign = useCallback(() => {
    if (!inviteLive) return;
    playClick();
    inviteVoiceRef.current?.cancel();
    inviteVoiceRef.current = null;
    router.push("/campaign?tutorial=briefing", { word: "THE THIRTEEN" });
  }, [inviteLive]);

  useEffect(() => {
    if (!inviteLive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (inviteLogOpen) {
        if (e.code === "Escape") { e.preventDefault(); closeInviteLog(); }
        return;
      }
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); goCampaign(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inviteLive, inviteLogOpen, goCampaign, closeInviteLog]);

  return (
    <IonPage>
      <div className={`v ${s.stage} ${short ? s.stageShort : ""}`}>
        <div className={`v ${s.halftone}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.jLine}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.echoLine}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.bRed}`} style={{ pointerEvents: "none" }} />
        <div className={`t ${s.watermark}`} style={{ pointerEvents: "none" }}>
          PACIFY
        </div>
        <div className={`t ${s.starA}`} style={{ pointerEvents: "none", animation: "p5-spin 22s linear infinite" }}>
          ✦
        </div>
        <div className={`t ${s.starB}`} style={{ pointerEvents: "none" }}>
          ✦
        </div>

        {/* rotating target ring — top right */}
        <div className={`v ${s.lTarget}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.lRingDash}`} style={{ animation: "p5-spin 14s linear infinite" }} />
          <div className={`v ${s.lRingSolid}`} />
          <div className={`v ${s.lDot}`} />
        </div>

        {/* floating suit diamonds */}
        <div
          className={`v ${s.diamond} ${s.diamondA}`}
          style={{ pointerEvents: "none", animation: "p5-float 4.5s ease-in-out infinite" }}
        />
        <div
          className={`v ${s.diamond} ${s.diamondB}`}
          style={{ pointerEvents: "none", animation: "p5-float 6s 1.2s ease-in-out infinite" }}
        />

        <div className={`v ${s.frame}`}>
          <div className={`v ${s.headAbs}`}>
            <div className={`t ${s.logo}`} style={{ animation: "heroIn 560ms 100ms both" }}>PACIFY</div>
            <div className={`t ${s.kicker}`}>SELECT YOUR POISON</div>
          </div>

          {NAV.map((it, i) => (
            <MenuRow
              key={it.label}
              it={it}
              i={i}
              short={short}
              inviteTarget={inviteLive && i === 0}
              rowRef={i === 0 ? campaignRowRef : undefined}
            />
          ))}
        </div>

        {/* hazard tape floor */}
        <div className={`v ${s.hazard}`} style={{ pointerEvents: "none" }} />
      </div>

      {/* ---------- MENU INVITATION — one fixed overlay above the stage. The
          menu frame's z-index traps its rows, so the whole group lives at the
          page level: click shield → full-screen dim → 1600×900 plane. ---------- */}
      {invite && inviteLive && (
        <div className={mi.inviteHost}>
          {/* every menu row is unreachable while Victor speaks */}
          <div className={mi.fullTap} />

          {/* full-screen dim with one hole over the CAMPAIGN row */}
          {inviteSpot && (
            <svg
              className={mi.spotlight}
              viewBox={`0 0 ${win.w} ${win.h}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <mask id="menu-invite-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                  <rect width={win.w} height={win.h} fill="white" />
                  <rect x={inviteSpot.real.x} y={inviteSpot.real.y} width={inviteSpot.real.w} height={inviteSpot.real.h} rx={12} fill="black" />
                </mask>
              </defs>
              <rect width={win.w} height={win.h} fill="rgba(0,0,0,0.72)" mask="url(#menu-invite-mask)" />
            </svg>
          )}

          <div className={tTrick.tutorialLayer} style={{ transform: `scale(${inviteScale})` }}>
            {/* the way forward — an invisible catcher over the lit row */}
            {inviteSpot && (
              <div
                className={mi.campaignCatch}
                style={{ left: inviteSpot.design.x, top: inviteSpot.design.y, width: inviteSpot.design.w, height: inviteSpot.design.h }}
                onClick={goCampaign}
                aria-hidden
              />
            )}

            <div className={mi.inviteTag}><div className={`t ${mi.inviteTagTxt}`}>FINAL BRIEFING</div></div>

            <div className={`v ${td.victorDock}`}>
              {(Object.keys(VICTOR_PORTRAITS) as VictorPose[]).map((p) => (
                <div
                  key={p}
                  className={`v ${td.victorImg}`}
                  style={{ backgroundImage: `url("${VICTOR_PORTRAITS[p]}")`, opacity: p === VICTOR_MENU_INVITE.pose ? 1 : 0 }}
                />
              ))}
            </div>

            {/* the orientation chatbox — same jagged bubble as phase one */}
            <div className={`v ${tut.dialogueHit} press`}>
              <BubbleArt />
              <div className={`v ${tut.dialogueContent}`}>
                <div className={`t ${tut.dialogueTxt}`}>
                  {inviteFull.slice(0, inviteChars)}
                  {!inviteDoneTxt && <span className={tut.caret}>▍</span>}
                </div>
                {inviteDoneTxt && <div className={`t ${td.coachHint} ${td.coachHintPick}`}>CLICK CAMPAIGN TO CONTINUE</div>}
              </div>
              <div className={`v ${tut.nameTag}`}><div className={`t ${tut.nameTxt}`}>VICTOR</div></div>
            </div>

            {!inviteLogOpen && (
              <div className={`v ${tut.logDock}`} style={{ pointerEvents: "auto" }}>
                <div
                  className={`v ${tut.logBtn} press`}
                  onMouseEnter={playHover}
                  onClick={(e) => { e.stopPropagation(); openInviteLog(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Open orientation log"
                  onKeyDown={(e) => {
                    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); openInviteLog(); }
                  }}
                >
                  <div className={`t ${tut.logBtnTxt}`}>▤ LOG</div>
                </div>
              </div>
            )}

            {inviteLogOpen && (
              <div className={`v ${tut.logOverlay}`} onClick={(e) => { e.stopPropagation(); closeInviteLog(); }}>
                <div className={`v ${tut.logPanel}`} onClick={(e) => e.stopPropagation()}>
                  <div className={`v ${tut.logHead}`}>
                    <div className={`t ${tut.logKicker}`}>ORIENTATION RECORD // VX—00</div>
                    <div className={`v ${tut.logTitleRow}`}>
                      <div className={`t ${tut.logTitle}`}>WHAT WAS SAID</div>
                      <div
                        className={`v ${tut.logCloseBtn} press`}
                        onMouseEnter={playHover}
                        onClick={closeInviteLog}
                        role="button"
                        tabIndex={0}
                        aria-label="Close orientation log"
                        onKeyDown={(e) => {
                          if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); closeInviteLog(); }
                        }}
                      >
                        <div className={`t ${tut.logCloseTxt}`}>CLOSE ✕</div>
                      </div>
                    </div>
                  </div>

                  <div className={`v ${tut.logScroll}`}>
                    {inviteHistory.length === 0 ? (
                      <div className={`t ${tut.logEmpty}`}>NOTHING ON RECORD YET.</div>
                    ) : inviteHistory.map((entry) => (
                      <div key={entry.id} className={`v ${tut.logEntry} ${entry.speaker === "YOU" ? tut.logEntryYou : ""}`}>
                        <div className={`v ${tut.logWho}`}>
                          <div className={`t ${tut.logWhoTxt} ${entry.speaker === "YOU" ? tut.logWhoYou : ""}`}>{entry.speaker}</div>
                        </div>
                        <div className={`t ${tut.logLine}`}>{entry.text}</div>
                      </div>
                    ))}
                  </div>

                  <div className={`v ${tut.logFoot}`}>
                    <div className={`t ${tut.logFootTxt}`}>
                      ORIENTATION RECORD — {String(inviteHistory.filter((e) => e.speaker === "VICTOR").length).padStart(2, "0")} ENTRIES
                    </div>
                    <div className={`t ${tut.logFootHint}`}>ESC / TAP OUTSIDE TO CLOSE</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </IonPage>
  );
}

function MenuRow({
  it,
  i,
  short,
  inviteTarget,
  rowRef,
}: {
  it: (typeof NAV)[number];
  i: number;
  short: boolean;
  inviteTarget?: boolean;
  rowRef?: RefObject<HTMLDivElement | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const enabled = !!it.to;
  return (
    <div
      ref={rowRef}
      className={`press ${s.jRow} ${!enabled ? s.jRowLocked : ""}`}
      onMouseEnter={() => {
        if (!enabled) return;
        setHovered(true);
        playHover();
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!it.to) return;
        playClick();
        router.push(it.to);
      }}
      style={{ animation: `rowIn 600ms ${120 + i * 70}ms both` }}
    >
      {inviteTarget && <div className={mi.rowRing} style={{ pointerEvents: "none" }} aria-hidden />}
      <div className={`v ${s.jInner}`} style={{ transform: `translateX(${(3 - i) * 18}px)` }}>
        <div className={`v ${s.jLeft}`}>
          <div className={`t ${s.idx} ${enabled && hovered ? s.idxOn : ""}`}>{it.n}</div>
          <div
            className={`v ${s.ransomWrap}`}
            style={
              hovered && enabled
                ? { animation: "p5-shiver 0.28s linear", transform: "translateX(-6px) scale(1.05)" }
                : undefined
            }
          >
            <Ransom text={it.label} size={short ? 27 : 48} dim={!enabled} box={BOX_INDEX[it.label]} />
          </div>
        </div>
        <div className={`v ${s.jRight}`}>
          {enabled ? (
            <>
              <div
                className={`t ${s.jSub}`}
                style={hovered ? { color: theme.color.yellow, letterSpacing: 3.5 } : undefined}
              >
                {it.sub}
              </div>
              <div
                className={`t ${s.jArrow}`}
                style={hovered ? { opacity: 1, transform: "translateX(6px)" } : undefined}
              >
                ▶
              </div>
            </>
          ) : (
            <div className={`v ${s.soonStamp}`}>
              <div className={`t ${s.soonStampTxt}`}>COMING SOON</div>
            </div>
          )}
        </div>
      </div>
      {hovered && enabled && <div className={`v ${s.sweepBar}`} style={{ pointerEvents: "none" }} />}
    </div>
  );
}
