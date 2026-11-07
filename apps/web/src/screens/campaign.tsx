/* CAMPAIGN — THE THIRTEEN SEATS — premium pointed tickets */
import { IonPage } from "@ionic/react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { playHover, playCardPop, playClick } from "../lib/sfx";
import { kleinChallengePath } from "../lib/encounter";
import { P5Back } from "../components/P5Back";
import { P5Image } from "../components/P5Image";
import s from "./campaign.module.css";

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

  return (
    <div className={`v ${s.dStage}`}>
      <div className={`v ${s.dHeader}`}>
        <div className={`t ${s.dTitle}`} style={{ animation: "heroIn 600ms 80ms both" }}>THE THIRTEEN</div>
        <div className={`t ${s.dSub}`} style={{ animation: "heroIn 500ms 260ms both" }}>
          VERTEX INSTITUTE — FIRST YEAR ELITE — HOVER A SEAT
        </div>
      </div>
      <style>{`@keyframes dChallengePop{from{opacity:0;transform:translateY(28px) skewX(-10deg) rotate(-1deg)}to{opacity:1;transform:translateY(0) skewX(-10deg) rotate(-1deg)}}@keyframes cardToChallenge{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-16px) scale(1.04)}100%{transform:translateY(-12px) scale(1)}}`}</style>

      <div className={`v ${s.dRow}`}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          const locked = st.id > Math.max(nextId, 3);
          const uri =
            st.id === 1
              ? "/students/2clubs9x16.png"
              : st.id === 2
                ? "/students/3clubs.png"
                : st.id === 3
                  ? "/students/4clubs.png"
                  : "/students/2clubs9x16.png";

          const isActive = selected === st.id;
          const rankLabel = (() => {
            const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
            return ranks[st.id - 1] ?? String(st.id);
          })();
          const imgCls = [
            s.dImg,
            st.id === 2 ? s.dImg3Cropped : s.dImgCropped,
            st.id === 2 ? s.dImg3Small : "",
            st.id === 3 ? s.dImg4Small : "",
            !isActive && locked ? s.dImgSilhouette : "",
            !isActive && !locked ? s.dImgGrayed : "",
            st.id === 2 && !isActive && !locked ? s.dImg3SmallSilhouette : "",
            st.id === 2 && !isActive && locked ? s.dImg3SmallSilhouette : "",
            st.id === 3 && !isActive && !locked ? s.dImg4SmallSilhouette : "",
            st.id === 3 && !isActive && locked ? s.dImg4SmallSilhouette : "",
            isActive ? s.dImgPop : "",
            st.id === 2 && isActive ? s.dImg3SmallPop : "",
            st.id === 3 && isActive ? s.dImg4SmallPop : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={st.id}
              className={`press ${s.dWrap} ${isActive ? s.dWrapSel : ""}`}
              style={{ animation: `jokerIn 500ms ${100 + i * 42}ms both` }}
              onClick={() => {
                if (locked) return;
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

              {/* character — single image ON TOP of the border */}
              <div
                className={`v ${s.dImageOnTop}`}
                style={{ pointerEvents: "none", ...(isActive && !locked ? { transform: "translateY(-12px)" } : null) }}
              >
                <P5Image
                  src={uri}
                  resizeMode="contain"
                  className={imgCls}
                  style={locked && !isActive ? { opacity: 0.28 } : undefined}
                />
              </div>

              {/* bottom mask — opaque layer on top of image, hides feet under it */}
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
                {/* center of lower-half — 2♣ when idle, CHALLENGE when popped */}
                <div className={`v ${s.dChallengeOnBorder}`}>
                  {isActive && !locked ? (
                    <div
                      className={`press ${s.dChallengePress}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                        router.push(st.id === 1 ? kleinChallengePath() : `/duel?student=${st.id}`);
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
                  ) : (
                    <div className={`v ${s.dClubsBadge}`} style={{ pointerEvents: "none" }}>
                      <div className={`t ${s.dClubsNum}`}>{rankLabel}</div>
                      <div className={`t ${s.dClubsSymbol}`}>♣</div>
                    </div>
                  )}
                </div>
              </div>

              {/* status badges — behind image when popped so it doesn't cover */}
              <div
                className={`v ${s.dContent}`}
                style={{ pointerEvents: "none", top: 54, zIndex: isActive ? 0 : 10 }}
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
