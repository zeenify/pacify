/* CAMPAIGN — THE THIRTEEN SEATS — premium pointed tickets */
import { IonPage } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { playHover, play } from "../lib/sfx";
import { challengePath } from "../lib/encounter";
import { rosterStudent } from "../data/roster";
import { P5Back } from "../components/P5Back";
import { P5Image } from "../components/P5Image";
import s from "./campaign.module.css";

/* Per-seat campaign art + class knobs. "Small" classes are card-numbered
   (dImg3Small = the 3♣ seat) and only win the cascade because they sit AFTER
   their base rules in campaign.module.css — keep that order. */
const SEAT_ART: { uri: string; crop: string; size?: string; sil?: string; pop?: string }[] = [
  { uri: "/students/2clubs9x16.png", crop: s.dImgCropped, pop: s.dImg2SmallPop }, // seat 1 — Klein
  { uri: "/students/3clubs.png", crop: s.dImg3Cropped, size: s.dImg3Small, sil: s.dImg3SmallSilhouette, pop: s.dImg3SmallPop }, // seat 2 — Mercy
  { uri: "/students/4clubs.png", crop: s.dImgCropped, size: s.dImg4Small, sil: s.dImg4SmallSilhouette, pop: s.dImg4SmallPop }, // seat 3 — Tally
  { uri: "/students/5clubs.png", crop: s.dImgCropped, pop: s.dImg5SmallPop }, // seat 4 — Jax
  { uri: "/students/6clubs.png", crop: s.dImgCropped, sil: s.dImg6SmallSilhouette, pop: s.dImg6SmallPop }, // seat 5 — Hayden
  { uri: "/students/7clubs.png", crop: s.dImgCropped, sil: s.dImg7SmallSilhouette, pop: s.dImg7SmallPop }, // seat 6 — Hyacinth
  { uri: "/students/8clubs.webp", crop: s.dImgCropped, sil: s.dImg8SmallSilhouette, pop: s.dImg8SmallPop }, // seat 7 — Yana
  { uri: "/students/9clubs.png", crop: s.dImgCropped, sil: s.dImg9SmallSilhouette, pop: s.dImg9SmallPop }, // seat 8 — PRIME (draft name)
  { uri: "/students/10clubs.png", crop: s.dImgCropped, sil: s.dImg10SmallSilhouette, pop: s.dImg10SmallPop }, // seat 9 — SOLEMN (draft name)
  { uri: "/students/jackclubs.png", crop: s.dImgCropped }, // seat 10 — ANTHONY
  { uri: "/students/queenclubs.png", crop: s.dImgCropped, sil: s.dImgQSil, pop: s.dImgQPop }, // seat 11 — CECILIA (art sits a little right-of-center)
  { uri: "/students/kingclubs.png", crop: s.dImgCropped }, // seat 12 — REEVE
];

type StudentRow = {
  id: number;
  seat: string;
  title: string;
  tier: number;
  cleared: boolean;
  attempts: number;
  wins: number;
  losses: number;
  bestScore: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type SeatStats = { wins: number; losses: number; draws: number; matches: number; winRate: number };

/* THREAT METER — the professor's difficulty read. The seats climb from the
   2♣ (a warm-up) to the A♣ (checkmate); thirteen notches, the filled run
   tells even a first-timer which end of the table bites. */
const threatColor = (tier: number) =>
  tier <= 2 ? "#FCEE21" : tier <= 5 ? "#FF9D1A" : tier <= 8 ? "#FF4D5E" : "#E60012";
const threatWord = (tier: number) =>
  tier <= 2 ? "WARM-UP" : tier <= 5 ? "ROUGH" : tier <= 8 ? "TOUGH" : tier <= 12 ? "VICIOUS" : "CHECKMATE";

export function campaignSeatMotion({
  offset,
  velocity,
  idle,
  recoil,
}: {
  offset: number;
  velocity: number;
  idle: number;
  recoil: number;
}) {
  const o = clamp(offset, -1, 1);
  const v = clamp(velocity, -90, 90);
  const wave = clamp(idle, -1, 1);
  const kick = clamp(recoil, -1, 1);
  const center = 1 - Math.abs(o);
  return {
    x: clamp(-v * 0.22 + o * 12 + kick * 54, -80, 80),
    y: Math.abs(o) * 24 + wave * 2.5,
    rotate: clamp(o * -7 - v * 0.065 + wave * 0.6 + kick * 7, -18, 18),
    scale: 0.9 + center * 0.1 + Math.abs(kick) * 0.04,
    skew: clamp(-v * 0.03, -4, 4),
  };
}

export function nearestSeatSnap(
  scrollLeft: number,
  viewportWidth: number,
  seats: { left: number; width: number }[],
  maxScroll: number,
) {
  const center = scrollLeft + viewportWidth / 2;
  const nearest = seats.reduce((best, seat) => {
    const seatCenter = seat.left + seat.width / 2;
    return Math.abs(seatCenter - center) < Math.abs(best.center - center)
      ? { center: seatCenter }
      : best;
  }, { center: seats[0].left + seats[0].width / 2 });
  return clamp(nearest.center - viewportWidth / 2, 0, maxScroll);
}

export default function Campaign() {
  const [data, setData] = useState<{ students: StudentRow[]; clearedCount: number } | null>(null);
  const [seatStats, setSeatStats] = useState<Record<string, SeatStats>>({});

  useEffect(() => {
    api("/campaign")
      .then((d: any) => setData(d))
      .catch(() => router.replace("/"));
  }, []);
  // global win rates — public aggregate, refreshes every visit to the board
  useEffect(() => {
    api("/campaign/characters")
      .then((d: any) => setSeatStats(d.stats ?? {}))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <IonPage>
        <div className={`v ${s.stage}`}>
          <div className={`t ${s.loadingTxt}`} style={{ animation: "p5-blinkHard 0.9s steps(2) infinite" }}>
            PLOTTING THE ROUTE…
          </div>
        </div>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 }} />
        <SampleD data={data} seatStats={seatStats} />
      </div>
    </IonPage>
  );
}

/* ============ D — PREMIUM POINTED TICKET — rebuilt from scratch ============ */
function SampleD({ data, seatStats }: { data: { students: StudentRow[]; clearedCount: number }; seatStats: Record<string, SeatStats> }) {
  const [selected, setSelected] = useState<number | null>(null);
  const nextId = data.clearedCount + 1;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const motionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const impactRef = useRef({ index: -1, at: 0 });
  const selectionSnapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragClickGuard = useRef(false);

  // far seats ride dimmed and light up as the strip brings them into view
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const wraps = Array.from(row.querySelectorAll<HTMLDivElement>('[class*="_dWrap_"]'));
    if (!wraps.length) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.target.classList.toggle(s.dWrapFar, !e.isIntersecting)),
      { root: row, rootMargin: "0px -60px 0px -60px" },
    );
    wraps.forEach((w) => {
      w.classList.add(s.dWrapFar);
      io.observe(w);
    });
    return () => io.disconnect();
  }, []);

  // The strip is a cast of individual objects, not one rigid row: position,
  // velocity, idle phase, and selection impact all feed each seat's transform.
  useEffect(() => {
    const row = rowRef.current;
    const stage = stageRef.current;
    if (!row || !stage) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let last = row.scrollLeft;
    let vel = 0;
    let raf = 0;
    let lastFrame = performance.now();
    let suppress = false;
    let snapTimer: ReturnType<typeof setTimeout> | undefined;
    const drag = { down: false, startX: 0, startScroll: 0, id: -1 };

    const snapToNearest = () => {
      if (drag.down || row.clientHeight <= 300) return;
      const seats = wrapRefs.current.flatMap((wrap) =>
        wrap ? [{ left: wrap.offsetLeft, width: wrap.offsetWidth }] : [],
      );
      if (!seats.length) return;
      row.scrollTo({
        left: nearestSeatSnap(row.scrollLeft, row.clientWidth, seats, row.scrollWidth - row.clientWidth),
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    };
    const scheduleSnap = (delay = 140) => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapToNearest, delay);
    };
    const onScroll = () => {
      const v = row.scrollLeft - last;
      last = row.scrollLeft;
      vel = vel * 0.55 + v * 0.45;
    };
    const tick = (now: number) => {
      const dt = Math.min(32, now - lastFrame);
      lastFrame = now;
      const viewCenter = row.scrollLeft + row.clientWidth / 2;
      const impactAge = now - impactRef.current.at;
      const impactProgress = clamp(impactAge / 520, 0, 1);
      const compact = row.clientHeight <= 300;
      const intensity = compact ? 0.28 : 1;
      const speed = reducedMotion.matches ? 0 : clamp((Math.abs(vel) - 10) / 55, 0, 1);
      stage.style.setProperty("--speed", speed.toFixed(3));
      stage.style.setProperty("--speedShift", `${(-Math.sign(vel) * speed * 140).toFixed(1)}px`);

      wrapRefs.current.forEach((wrap, i) => {
        const motion = motionRefs.current[i];
        if (!wrap || !motion) return;
        if (reducedMotion.matches) {
          motion.style.transform = "none";
          return;
        }
        const seatCenter = wrap.offsetLeft + wrap.offsetWidth / 2;
        const offset = (seatCenter - viewCenter) / Math.max(1, row.clientWidth * 0.58);
        let recoil = 0;
        if (impactAge < 520 && impactRef.current.index >= 0 && i !== impactRef.current.index) {
          const distance = Math.abs(i - impactRef.current.index);
          const direction = i < impactRef.current.index ? -1 : 1;
          recoil = direction * Math.sin(impactProgress * Math.PI) * Math.max(0.16, 1 - distance * 0.2);
        }
        const idle = compact || wrap.classList.contains(s.dWrapSel) ? 0 : Math.sin(now / 850 + i * 1.7);
        const m = campaignSeatMotion({ offset, velocity: vel, idle, recoil });
        let punch = 0;
        if (i === impactRef.current.index && impactAge < 520) {
          punch = Math.sin(impactProgress * Math.PI);
        }
        const x = (m.x * intensity) + punch * (i % 2 ? 5 : -5);
        const y = (m.y - punch * 16) * intensity;
        const rotate = (m.rotate + punch * (i % 2 ? 2.5 : -2.5)) * intensity;
        const scale = 1 + (m.scale - 1 + punch * 0.07) * intensity;
        motion.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotate.toFixed(2)}deg) skewX(${m.skew.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      });
      vel *= Math.pow(0.88, dt / 16.67);
      raf = requestAnimationFrame(tick);
    };
    const onWheel = (e: WheelEvent) => {
      if (row.clientHeight <= 300) return;
      clearTimeout(selectionSnapTimer.current);
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        row.scrollLeft += e.deltaY * 1.15;
        scheduleSnap();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (row.clientHeight <= 300 || e.pointerType !== "mouse" || e.button !== 0) return;
      clearTimeout(snapTimer);
      clearTimeout(selectionSnapTimer.current);
      drag.down = true;
      drag.startX = e.clientX;
      drag.startScroll = row.scrollLeft;
      drag.id = e.pointerId;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.down || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 6) {
        suppress = true;
        row.scrollLeft = drag.startScroll - dx;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.id) return;
      drag.down = false;
      dragClickGuard.current = suppress;
      scheduleSnap(50);
      setTimeout(() => {
        suppress = false;
        dragClickGuard.current = false;
      }, 0);
    };
    const onClickCapture = (e: MouseEvent) => {
      if (suppress) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const onResize = () => {
      if (row.clientHeight <= 300) row.scrollLeft = 0;
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    row.addEventListener("wheel", onWheel, { passive: false });
    row.addEventListener("pointerdown", onPointerDown);
    row.addEventListener("pointermove", onPointerMove);
    row.addEventListener("pointerup", onPointerUp);
    row.addEventListener("pointercancel", onPointerUp);
    row.addEventListener("click", onClickCapture, true);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(snapTimer);
      clearTimeout(selectionSnapTimer.current);
      row.removeEventListener("scroll", onScroll);
      row.removeEventListener("wheel", onWheel);
      row.removeEventListener("pointerdown", onPointerDown);
      row.removeEventListener("pointermove", onPointerMove);
      row.removeEventListener("pointerup", onPointerUp);
      row.removeEventListener("pointercancel", onPointerUp);
      row.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className={`v ${s.dStage}`} ref={stageRef}>
      <div className={`v ${s.dBackdrop}`} aria-hidden="true">
        <div className={`t ${s.dBackdropWord}`}>THIRTEEN</div>
        <div className={`v ${s.dBackdropSlash}`} />
        <div className={`t ${s.dBackdropIndex}`}>13 / TARGETS</div>
      </div>
      <div className={`v ${s.dSpeedField}`} aria-hidden="true">
        <div className={`v ${s.dSpeedLine}`} />
        <div className={`v ${s.dSpeedLine}`} />
      </div>
      <div className={`v ${s.dHeader}`}>
        <div className={`t ${s.dTitle}`} style={{ animation: "heroIn 600ms 80ms both" }}>THE THIRTEEN</div>
        <div className={`t ${s.dSub}`} style={{ animation: "heroIn 500ms 260ms both" }}>
          VERTEX INSTITUTE — FIRST YEAR ELITE — HOVER A SEAT
        </div>
      </div>

      <div className={`v ${s.dRow}`} ref={rowRef}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          // No seat is locked — challenge anyone. Unfinished seats refuse in
          // person (story refusal scene); Klein is the only real fight so far.
          const locked = false;
          // seats 10-13 have no art yet — blank beats wrong art
          const art = SEAT_ART[st.id - 1] ?? { uri: "", crop: s.dImgCropped };

          const isActive = selected === st.id;
          const rec = seatStats[String(st.id)] ?? { wins: 0, losses: 0, draws: 0, matches: 0, winRate: 100 };
          const wrColor = rec.winRate >= 100 ? "#FCEE21" : rec.winRate >= 50 ? "#FFFFFF" : "#FF4D5E";
          const rankLabel = (() => {
            const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
            return ranks[st.id - 1] ?? String(st.id);
          })();
          const imgCls = [
            s.dImg,
            art.crop,
            art.size ?? "",
            isActive ? s.dImgPop : s.dImgGrayed,
            !isActive && art.sil ? art.sil : "",
            isActive && art.pop ? art.pop : "",
          ].join(" ");
          return (
            <div
              key={st.id}
              ref={(el) => { wrapRefs.current[i] = el; }}
              className={`press ${s.dWrap} ${isActive ? s.dWrapSel : ""}`}
              style={{ animationDelay: `${80 + i * 52}ms` }}
              onClick={() => {
                if (locked || dragClickGuard.current) return;
                const willSelect = selected !== st.id;
                if (willSelect) {
                  play("campaign.ticket.pick");
                  impactRef.current = { index: i, at: performance.now() };
                  const row = rowRef.current;
                  clearTimeout(selectionSnapTimer.current);
                  const centerSelectedSeat = () => {
                    const wrap = wrapRefs.current[i];
                    if (!row || !wrap) return;
                    if (row.clientHeight <= 300) {
                      row.scrollLeft = 0;
                      return;
                    }
                    if (row.scrollWidth <= row.clientWidth) return;
                    row.scrollTo({
                      left: clamp(
                        wrap.offsetLeft + wrap.offsetWidth / 2 - row.clientWidth / 2,
                        0,
                        row.scrollWidth - row.clientWidth,
                      ),
                      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    });
                  };
                  centerSelectedSeat();
                  selectionSnapTimer.current = setTimeout(centerSelectedSeat, 560);
                } else {
                  playHover();
                  impactRef.current.index = -1;
                  clearTimeout(selectionSnapTimer.current);
                }
                setSelected(willSelect ? st.id : null);
              }}
            >
              <div className={`v ${s.dSeatMotion}`} ref={(el) => { motionRefs.current[i] = el; }}>
              {/* border shell — base behind image */}
              <div
                className={`v ${s.dShell} ${locked ? s.dShellLocked : ""} ${st.cleared ? s.dShellCleared : ""} ${
                  isNext ? s.dShellNext : ""
                } ${!locked && !isNext && !st.cleared ? s.dShellOpen : ""} ${isActive && !locked ? s.dShellSel : ""}`}
                style={{ pointerEvents: "none" }}
              >
                <div
                  className={`v ${s.dFill} ${locked ? s.dFillLocked : ""} ${st.cleared ? s.dFillCleared : ""} ${
                    isNext ? s.dFillNext : ""
                  }`}
                >
                  <div className={`v ${s.dHighlight}`} style={{ pointerEvents: "none" }} />
                </div>
                <div className={`v ${s.dRivet} ${s.dRivetTop}`} style={{ pointerEvents: "none" }} />
                <div className={`v ${s.dRivet} ${s.dRivetBottom}`} style={{ pointerEvents: "none" }} />
              </div>

              {/* character — BASE copy, clipped to the ticket silhouette and
                  always UNDER the bottom panel: the panel occludes the art's
                  lower part so the character tucks into the ticket's bottom
                  container; only the upper body (POP copy) leaves the box */}
              <div
                className={`v ${s.dImageOnTop}`}
                style={{ pointerEvents: "none", ...(isActive && !locked ? { transform: "translateY(-12px)" } : null) }}
              >
                <P5Image
                  src={art.uri}
                  resizeMode="contain"
                  className={imgCls}
                  style={locked && !isActive ? { opacity: 0.28 } : undefined}
                />
              </div>

              {/* character — POP copy: identical art/transform, hidden at rest.
                  On select its window opens top+sides so head/arms rise out of
                  the box and over the neighbors; the bottom cut (70%) keeps the
                  lower body ticket-contained (the BASE copy carries that inside).
                  It KEEPS the per-seat crop so it never leaks past the button. */}
              <div
                className={`v ${s.dImageOnTopPop} ${isActive && !locked ? s.dImageOnTopPopSel : ""}`}
                style={{ pointerEvents: "none", ...(isActive && !locked ? { transform: "translateY(-12px)" } : null) }}
              >
                <P5Image src={art.uri} resizeMode="contain" className={imgCls} />
              </div>

              {/* bottom mask — opaque panel over the art's feet at rest */}
              <div
                className={`v ${s.dBottomMask} ${locked ? s.dShellLocked : ""} ${st.cleared ? s.dShellCleared : ""} ${
                  isNext ? s.dShellNext : ""
                } ${isActive && !locked ? s.dShellSel : ""}`}
              >
                <div
                  className={`v ${s.dBottomMaskInner} ${locked ? s.dFillLocked : ""} ${st.cleared ? s.dFillCleared : ""} ${
                    isNext ? s.dFillNext : ""
                  }`}
                  style={{ pointerEvents: "none" }}
                />
                {/* GLOBAL INTEL — difficulty meter + the world's record against
                    this seat. Sits in the mask's upper band; the badge/button
                    zone below it stays clear. Hidden while selected — the
                    CHALLENGE button owns that band. */}
                {!isActive && (
                  <div className={`v ${s.dSeatIntel}`} style={{ pointerEvents: "none" }}>
                    <div className={`v ${s.dThreatMeter}`}>
                      <div className={`v ${s.dThreatFill}`} style={{ width: `${Math.round((st.tier / 13) * 100)}%`, backgroundColor: threatColor(st.tier) }} />
                    </div>
                    <div className={`t ${s.dThreatWord}`} style={{ color: threatColor(st.tier) }}>{threatWord(st.tier)}</div>
                    <div className={`v ${s.dIntelRow}`}>
                      <div className={`t ${s.dIntelWr}`} style={{ color: wrColor }}>{rec.winRate}%</div>
                      <div className={`t ${s.dIntelRec}`}>{rec.wins}W · {rec.losses}L · {rec.draws}D</div>
                    </div>
                  </div>
                )}
                {/* club badge — idle only. The CHALLENGE button lives OUTSIDE the
                    mask (below) so it paints above the popped art copies. */}
                {!isActive && (
                  <div className={`v ${s.dChallengeOnBorder}`}>
                    <div className={`v ${s.dClubsBadge}`} style={{ pointerEvents: "none" }}>
                      <div className={`t ${s.dClubsNum}`}>{rankLabel}</div>
                      <div className={`t ${s.dClubsSymbol}`}>♣</div>
                    </div>
                  </div>
                )}
              </div>

              {/* CHALLENGE button — outside the mask, in an anchor that mirrors
                  the mask box (identical position) but paints at z4 above both
                  art copies and tracks the ticket's selected rise */}
              {isActive && !locked && (
                <div className={`v ${s.dChallengeAnchor} ${s.dChallengeAnchorSel}`} style={{ pointerEvents: "none" }}>
                  <div className={`v ${s.dChallengeOnBorder}`}>
                    <div
                      className={`press ${s.dChallengePress}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        play("campaign.ticket.claim");
                        const rs = rosterStudent(st.id);
                        if (rs?.ready) {
                          // a real fight exists — story prelude → duel → epilogue, like Klein
                          router.push(challengePath(st.id), { word: rs.name });
                        } else {
                          // refusal gate — the student turns the challenge down in person
                          router.push(`/story?student=${st.id}`, { word: rs?.name ?? `SEAT ${String(st.id).padStart(2, "0")}` });
                        }
                      }}
                    >
                      <div
                        className={`v ${s.dChallengeOnBorderBtn} ${s.dChallengePopIn} ${
                          st.cleared ? "" : ""
                        }`}
                      >
                        <div className={`t ${s.dChallengeOnBorderTxt}`}>
                          {st.cleared ? "REMATCH" : "CHALLENGE "}
                          <span className={`ti ${s.dChallengeArrow}`}>▶</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* identity — the seat's NAME where the old status tag sat, with
                  the game-state pip demoted to a small chip under it */}
              <div
                className={`v ${s.dContent}`}
                style={{ pointerEvents: "none", top: 56, zIndex: isActive ? 0 : 10 }}
              >
                <div className={`v ${s.dNamePlate} ${isNext && !st.cleared ? s.dNamePlateNext : st.cleared ? s.dNamePlateCleared : ""}`}>
                  <div className={`t ${s.dNamePlateTxt}`}>{st.title}</div>
                </div>
                {locked && (
                  <div className={`v ${s.dLockBadge}`}>
                    <div className={`t ${s.dLockTxt}`}>LOCKED</div>
                  </div>
                )}
                {st.cleared && !locked && (
                  <div className={`v ${s.dClearedBadge}`}>
                    <div className={`t ${s.dClearedTxt}`}>PACIFIED</div>
                  </div>
                )}
                {isNext && !st.cleared && !locked && (
                  <div className={`v ${s.dNextBadge}`}>
                    <div className={`t ${s.dNextTxt}`}>TARGET</div>
                  </div>
                )}
                {!locked && !isNext && !st.cleared && (
                  <div className={`v ${s.dOpenBadge}`}>
                    <div className={`t ${s.dOpenTxt}`}>OPEN</div>
                  </div>
                )}
              </div>

              {isActive && (
                <div className={`v ${s.dImpact}`} aria-hidden="true">
                  <div className={`v ${s.dImpactRing}`} />
                  <div className={`v ${s.dImpactSlash}`} />
                  <div className={`v ${s.dImpactSlashB}`} />
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
