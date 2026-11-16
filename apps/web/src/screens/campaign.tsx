/* CAMPAIGN — THE THIRTEEN SEATS — premium pointed tickets */
import { IonPage } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { playHover, playCardPop, playClick } from "../lib/sfx";
import { kleinChallengePath } from "../lib/encounter";
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

export default function Campaign() {
  const [data, setData] = useState<{ students: StudentRow[]; clearedCount: number } | null>(null);

  useEffect(() => {
    api("/campaign")
      .then((d: any) => setData(d))
      .catch(() => router.replace("/"));
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
        <SampleD data={data} />
      </div>
    </IonPage>
  );
}

/* ============ D — PREMIUM POINTED TICKET — rebuilt from scratch ============ */
function SampleD({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const [selected, setSelected] = useState<number | null>(null);
  const nextId = data.clearedCount + 1;
  const rowRef = useRef<HTMLDivElement | null>(null);
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

  // game-strip feel: wheel maps to horizontal, the strip drags to pan (mouse),
  // and the whole row shears with scroll velocity then eases back upright
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let last = row.scrollLeft;
    let vel = 0;
    let skew = 0;
    let raf = 0;
    let suppress = false;
    const drag = { down: false, startX: 0, startScroll: 0, id: -1 };
    const onScroll = () => {
      const v = row.scrollLeft - last;
      last = row.scrollLeft;
      vel = vel * 0.6 + v * 0.4;
    };
    const tick = () => {
      const target = Math.max(-2.5, Math.min(2.5, -vel * 0.18));
      skew += (target - skew) * 0.16;
      if (Math.abs(skew) > 0.05) row.style.setProperty("--rowSkew", skew.toFixed(3) + "deg");
      else if (skew !== 0) {
        row.style.setProperty("--rowSkew", "0deg");
        skew = 0;
      }
      vel *= 0.9;
      raf = requestAnimationFrame(tick);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        row.scrollLeft += e.deltaY;
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
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
      // the click from that drag lands right after pointerup — clear next tick
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
    row.addEventListener("scroll", onScroll, { passive: true });
    row.addEventListener("wheel", onWheel, { passive: false });
    row.addEventListener("pointerdown", onPointerDown);
    row.addEventListener("pointermove", onPointerMove);
    row.addEventListener("pointerup", onPointerUp);
    row.addEventListener("pointercancel", onPointerUp);
    row.addEventListener("click", onClickCapture, true);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      row.removeEventListener("scroll", onScroll);
      row.removeEventListener("wheel", onWheel);
      row.removeEventListener("pointerdown", onPointerDown);
      row.removeEventListener("pointermove", onPointerMove);
      row.removeEventListener("pointerup", onPointerUp);
      row.removeEventListener("pointercancel", onPointerUp);
      row.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return (
    <div className={`v ${s.dStage}`}>
      <div className={`v ${s.dHeader}`}>
        <div className={`t ${s.dTitle}`} style={{ animation: "heroIn 600ms 80ms both" }}>THE THIRTEEN</div>
        <div className={`t ${s.dSub}`} style={{ animation: "heroIn 500ms 260ms both" }}>
          VERTEX INSTITUTE — FIRST YEAR ELITE — HOVER A SEAT
        </div>
      </div>
      <style>{`@keyframes dChallengePop{from{opacity:0;transform:translateY(28px) skewX(-10deg) rotate(-1deg)}to{opacity:1;transform:translateY(0) skewX(-10deg) rotate(-1deg)}}@keyframes cardToChallenge{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-16px) scale(1.04)}100%{transform:translateY(-12px) scale(1)}}`}</style>

      <div className={`v ${s.dRow}`} ref={rowRef}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          // No seat is locked — challenge anyone. Unfinished seats refuse in
          // person (story refusal scene); Klein is the only real fight so far.
          const locked = false;
          // seats 8-13 have no art yet — blank beats wrong art
          const art = SEAT_ART[st.id - 1] ?? { uri: "", crop: s.dImgCropped };

          const isActive = selected === st.id;
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
              className={`press ${s.dWrap} ${isActive ? s.dWrapSel : ""}`}
              style={{ animation: `jokerIn 500ms ${100 + i * 42}ms both` }}
              onClick={() => {
                if (locked || dragClickGuard.current) return;
                const willSelect = selected !== st.id;
                if (willSelect) playCardPop();
                else playHover();
                setSelected(willSelect ? st.id : null);
              }}
            >
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
                        playClick();
                        const rs = rosterStudent(st.id);
                        if (st.id === 1) {
                          router.push(kleinChallengePath(), { word: "KLEIN" });
                        } else if (rs?.ready) {
                          // a real fight exists — straight to the duel
                          router.push(`/duel?student=${st.id}`,
                            { vs: { ln: "YOU", lt: "7 CARDS · 3 TRICKS MAX", rn: rs.name,
                                rt: `TARGET ${String(st.id).padStart(2, "0")}` } });
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

              {/* status badges — behind image when popped so it doesn't cover */}
              <div
                className={`v ${s.dContent}`}
                style={{ pointerEvents: "none", top: 72, zIndex: isActive ? 0 : 10 }}
              >
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
