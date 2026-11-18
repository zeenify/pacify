/* HALL OF SHAME / FAME — LOCKED. Centered premium composition: giant ransom
   title stack, podium with medals/ribbons/tacks, poster roster, framed by a
   live ticker, target ring, starburst, speed-lines, drifting glyphs, halftone,
   diamonds and a marquee hazard floor. Roster scrolls; nothing overlaps.
   The wall ranks by WEIGHTED score, not raw counts — losing to the tutorial
   seat is the deepest shame, taking the Ace down is the true crown. */
import { IonPage } from "@ionic/react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { playClick, playHover } from "../lib/sfx";
import { P5Back } from "../components/P5Back";
import s from "./shame.module.css";

type ShameRow = {
  rank: number;
  name: string;
  isNpc: boolean;
  isMe: boolean;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  played: number;
  winRate: number;
  seatsFought: number;
  shameScore: number;
  crownScore: number;
  seats: { id: number; w: number; l: number; d: number }[];
};

type Board = "shame" | "fame";

/* landscape-phone — the podium slab heights are inline, so the phone steps
   them down in JS (desktop keeps the tall pedestals) */
function useShortViewport() {
  const [short, setShort] = useState(() => window.innerHeight < 560);
  useEffect(() => {
    const on = () => setShort(window.innerHeight < 560);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return short;
}

export default function Shame() {
  const [rows, setRows] = useState<ShameRow[] | null>(null);
  const [fameRows, setFameRows] = useState<ShameRow[]>([]);
  const [board, setBoard] = useState<Board>("shame");
  const [hovSlab, setHovSlab] = useState(-1);
  const short = useShortViewport();

  useEffect(() => {
    api("/shame")
      .then((d: any) => {
        setRows(d.rows ?? []);
        setFameRows(d.fame ?? []);
      })
      .catch(() => setRows([]));
  }, []);

  if (!rows) {
    return (
      <IonPage>
        <div className={`v ${s.stage}`}>
          <div className={`t ${s.loadingTxt}`} style={{ animation: "p5-blinkHard 0.9s steps(2) infinite" }}>
            PULLING THE RECORDS…
          </div>
        </div>
      </IonPage>
    );
  }

  if (rows.length === 0) {
    return (
      <IonPage>
        <div className={`v ${s.stage}`}>
          <div className={`t ${s.loadingTxt}`}>NO RECORDS YET</div>
          <div className={`t ${s.loadingTxt}`} style={{ fontSize: 14, opacity: 0.6, marginTop: 10 }}>
            THE WALL AWAITS ITS FIRST LOSER
          </div>
        </div>
      </IonPage>
    );
  }

  const active = board === "shame" ? rows : fameRows;

  const fame = board === "fame";
  // positions come from RANK, never array order — immune to stale/unsorted data
  const king = active.find((r) => r.rank === 1) ?? null;
  const p2 = active.find((r) => r.rank === 2) ?? null;
  const p3 = active.find((r) => r.rank === 3) ?? null;
  const rest = active.filter((r) => r.rank > 3);
  const bigOf = (r: ShameRow) => (fame ? r.crownScore : r.shameScore);
  // a podium seat is EARNED — a zero score never gets crowned, the seat stays open
  const hasKing = !!king && bigOf(king) > 0;
  const hasP2 = !!p2 && bigOf(p2) > 0;
  const hasP3 = !!p3 && bigOf(p3) > 0;
  const tickerSrc = fame
    ? `HALL OF FAME ✦ FIRST YEAR DIVISION ✦ VERTEX INSTITUTE ✦ THE CROWN: ${hasKing ? king?.name : "UNCLAIMED"} ✦ `
    : `HALL OF SHAME ✦ FIRST YEAR DIVISION ✦ VERTEX INSTITUTE ✦ REIGNING KING: ${hasKing ? king?.name : "???"} ✦ `;
  const ticker = tickerSrc.repeat(6);
  const title = fame ? "HALL OF FAME" : "HALL OF SHAME";

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        {/* ---- top ticker rail ---- */}
        <div className={`v ${s.tickerRail}`} style={{ pointerEvents: "none" }}>
          <div className={`v`} style={{ flexDirection: "row", width: "200%" }}>
            {[0, 1].map((h) => (
              <div key={h} className={`t ${s.tickerRailTxt}`} style={{ animation: "p5-marquee 28s linear infinite" }}>
                {ticker}
              </div>
            ))}
          </div>
        </div>

        {/* ---- ambient field ---- */}
        <div className={`v ${s.linesWrap}`} style={{ pointerEvents: "none" }}>
          {[
            { top: "26%", h: 4, dur: "10s", dir: "", col: "rgba(252,238,33,0.07)", d: "0s" },
            { top: "60%", h: 3, dur: "15s", dir: " reverse", col: "rgba(255,255,255,0.05)", d: "1s" },
          ].map((L, i) => (
            <div
              key={i}
              className={`v`}
              style={{ position: "absolute", left: "-20%", right: "-20%", top: L.top, height: L.h, overflow: "hidden" }}
            >
              <div className={`v`} style={{ flexDirection: "row", width: "200%", transform: "skewX(-16deg)" }}>
                {[0, 1].map((half) => (
                  <div
                    key={half}
                    className={`v`}
                    style={{
                      width: "100%",
                      backgroundImage: `repeating-linear-gradient(90deg, ${L.col} 0 52px, transparent 52px 124px)`,
                      height: L.h,
                      animation: `p5-marquee${L.dir} ${L.dur} linear infinite`,
                      animationDelay: L.d,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ghost 13 */}
        <div className={`t ${s.ghost13}`} style={{ pointerEvents: "none" }}>
          13
        </div>

        {/* drifting glyphs */}
        <div className={`v ${s.driftWrap}`} style={{ pointerEvents: "none" }}>
          {[
            { ch: "✕", t: "18%", l: "38%", sz: 32, o: 0.09 },
            { ch: "!", t: "74%", l: "6%", sz: 40, o: 0.06 },
            { ch: "?", t: "22%", l: "95%", sz: 36, o: 0.07 },
            { ch: "P", t: "88%", l: "55%", sz: 48, o: 0.04 },
            { ch: "V", t: "8%", l: "72%", sz: 42, o: 0.05 },
          ].map((g, i) => (
            <div
              key={i}
              className={`t ${s.driftGlyph}`}
              style={{
                top: g.t,
                left: g.l,
                fontSize: g.sz,
                opacity: g.o,
                animationDuration: `${4.5 + i}s`,
                animationDelay: `${-i * 0.9}s`,
              }}
            >
              {g.ch}
            </div>
          ))}
        </div>

        {/* floating diamonds */}
        <div className={`v`} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
          {[
            { t: "14%", l: "30%", sz: 13, d: "0s" },
            { t: "80%", l: "26%", sz: 10, d: "1.2s" },
            { t: "18%", l: "97%", sz: 14, d: "0.7s" },
            { t: "70%", l: "97%", sz: 9, d: "1.8s" },
          ].map((dm, i) => (
            <div
              key={i}
              className={`t ${s.diamond}`}
              style={{ top: dm.t, left: dm.l, fontSize: dm.sz, animationDelay: dm.d }}
            >
              ◆
            </div>
          ))}
        </div>

        {/* halftone patches */}
        <div className={`v ${s.halftone}`} style={{ top: "12%", right: "5%", pointerEvents: "none" }} />
        <div className={`v ${s.halftone}`} style={{ bottom: "14%", left: "4%", pointerEvents: "none" }} />

        <P5Back style={{ position: "absolute", top: short ? 32 : 48, left: 20, zIndex: 99 }} />

        {/* ---- centered composition ---- */}
        <div className={`v ${s.center}`}>
          {/* LEFT — vertical ransom letters (options-page style) */}
          <div className={`v ${s.titleCol}`}>
            {title.split("").map((ch, i) => (
              <div key={i} className={`v`} style={i > 3 && i < 6 ? { paddingLeft: 24 } : undefined}>
                <div
                  className={`t ${s.vLetter} ${i % 3 === 0 ? s.vLetterC : ""} ${i % 3 === 2 ? s.vLetterY : ""}`}
                  style={{ animation: `p5-logoLetter 550ms ${i * 55}ms cubic-bezier(0.16,1,0.3,1) both` }}
                >
                  {ch}
                </div>
              </div>
            ))}
            <div className={`v ${s.titleRibbon}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.titleRibbonTxt}`}>FIRST YEAR DIVISION</div>
            </div>
          </div>

          {/* RIGHT — board tabs + podium + roster */}
          <div className={`v ${s.mainCol}`}>
            {/* board toggle — shame is the default; fame hides here too */}
            <div className={`v ${s.boardTabs}`}>
              {(["shame", "fame"] as Board[]).map((b) => (
                <div
                  key={b}
                  className={`press ${s.boardTab} ${board === b ? s.boardTabOn : ""}`}
                  onMouseEnter={playHover}
                  onClick={() => {
                    if (board === b) return;
                    playClick();
                    setHovSlab(-1);
                    setBoard(b);
                  }}
                >
                  <div className={`t ${s.boardTabTxt}`}>{b === "shame" ? "HALL OF SHAME" : "HALL OF FAME"}</div>
                </div>
              ))}
              <div className={`t ${s.boardHint}`}>
                {fame ? "MOST CROWN POINTS — BEAT THE HIGH SEATS" : "MOST SHAME POINTS — LOSING TO THE 2♣ HURTS MOST"}
              </div>
            </div>

            {/* starburst behind podium */}
            <div className={`v ${s.podiumBurst}`} style={{ pointerEvents: "none" }} />

            <div className={`v ${s.podium}`}>
              {[
                { r: hasP2 ? p2 : null, h: short ? 80 : 124, label: "2ND", king: false },
                { r: hasKing ? king : null, h: short ? 100 : 156, label: "1ST — KING", king: true },
                { r: hasP3 ? p3 : null, h: short ? 82 : 130, label: "3RD", king: false },
              ].map(({ r, h, label, king: isKing }, i) => {
                // empty seats stay visible — dashed, bland, waiting
                if (!r) {
                  return (
                    <div key={label} className={`v`} style={{ position: "relative" }}>
                      <div className={`v ${s.slab} ${s.slabEmpty}`} style={{ height: h }}>
                        <div className={`t ${s.emptyLabel}`}>{label}</div>
                        <div className={`t ${s.emptySeat}`}>SEAT OPEN</div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={label}
                    className={`v`}
                    style={{ position: "relative" }}
                    onMouseEnter={() => setHovSlab(i)}
                    onMouseLeave={() => setHovSlab(-1)}
                  >
                    {/* medal */}
                    <div
                      className={`v ${s.medalOuter} ${isKing ? s.medalOuterKing : ""} ${hovSlab === i ? s.medalSpin : ""}`}
                      style={{ pointerEvents: "none", transition: "transform 650ms cubic-bezier(0.16,1,0.3,1)" }}
                    >
                      <div className={`v ${s.medalInner} ${isKing ? s.medalInnerKing : ""}`}>
                        <div className={`t ${isKing ? s.medalTxt : s.medalNum}`}>{isKing ? "✦" : String(r.rank)}</div>
                      </div>
                    </div>
                    {isKing && (
                      <>
                        <div className={s.ribbonL} style={{ pointerEvents: "none" }} />
                        <div className={s.ribbonR} style={{ pointerEvents: "none" }} />
                      </>
                    )}
                    <div
                      className={`v ${s.slab} ${isKing ? s.slabKing : ""} ${hovSlab === i ? s.slabHov : ""}`}
                      style={{
                        height: h,
                        animation: `${isKing ? "p5-kingIn 650ms 520ms" : `p5-slabIn 550ms ${220 + i * 130}ms`} both`,
                      }}
                    >
                      {/* corner tacks */}
                      <div className={`v ${s.tack}`} style={{ top: 4, left: 4 }} />
                      <div className={`v ${s.tack}`} style={{ top: 4, right: 4 }} />
                      <div className={`v ${s.tack}`} style={{ bottom: 4, left: 4 }} />
                      <div className={`v ${s.tack}`} style={{ bottom: 4, right: 4 }} />
                      {isKing ? (
                        <div className={`v ${s.kingChip}`}>
                          <div className={`t ${s.kingChipTxt}`}>1ST — KING</div>
                        </div>
                      ) : (
                        <div className={`t ${s.slabRank}`}>{label}</div>
                      )}
                      <div className={`t ${s.slabName}`}>{r.name}</div>
                      {/* THE NUMBER — the weighted score, huge; the raw line demoted */}
                      <div className={`v ${s.slabScoreCol}`}>
                        <div className={`t ${isKing ? s.slabScoreKing : s.slabScoreBig}`}>{bigOf(r)}</div>
                        <div className={`t ${s.slabScoreLbl}`}>{fame ? "CROWN PTS" : "SHAME PTS"}</div>
                        <div className={`t ${s.slabScoreSub}`}>
                          {fame ? `${r.wins} WINS · ${r.seatsFought} ${r.seatsFought === 1 ? "SEAT" : "SEATS"}` : `${r.losses} LOSSES · ${r.seatsFought} ${r.seatsFought === 1 ? "SEAT" : "SEATS"}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* roster */}
            <div className={`v ${s.roster} noscroll`}>
              <div className={`v ${s.rosterContent}`}>
                {rest.length === 0 && (
                  <div className={`v ${s.emptyRow}`}>
                    <div className={`v ${s.emptyRowInner}`}>
                      <div className={`t ${s.emptyRowMark}`}>✕</div>
                      <div className={`v`} style={{ flex: 1 }}>
                        <div className={`t ${s.emptyRowTitle}`}>THE WALL AWAITS</div>
                        <div className={`t ${s.emptyRowSub}`}>EVERY DUEL EARNS A PLACE HERE — GO PLAY.</div>
                      </div>
                    </div>
                  </div>
                )}
                {rest.map((r, i) => (
                  <RosterRow key={`${board}-${r.rank}`} r={r} i={i} fame={fame} />
                ))}
              </div>
            </div>

            <div className={`t ${s.foot}`}>{fame ? "THE CROWN BELONGS TO SOMEONE — TAKE IT." : "DON'T BE LISTED HERE."}</div>
          </div>
        </div>

        {/* hazard tape floor */}
        <div className={`v ${s.tapeWrap}`} style={{ pointerEvents: "none" }}>
          <div className={`v`} style={{ flexDirection: "row", width: "200%" }}>
            {[0, 1].map((half) => (
              <div
                key={half}
                className={`v`}
                style={{
                  width: "100%",
                  height: 12,
                  backgroundImage: "repeating-linear-gradient(45deg, #FCEE21 0 16px, #111 16px 32px)",
                  animation: "p5-marquee 16s linear infinite",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </IonPage>
  );
}

const SEAT_GLYPHS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function RosterRow({ r, i, fame }: { r: ShameRow; i: number; fame: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // a zero score has no rank — the number only appears when it was earned
  const earned = (fame ? r.crownScore : r.shameScore) > 0;
  return (
    <div className={`v ${s.rowWrap}`} style={{ animation: `p5-rowSlide 380ms ${420 + i * 40}ms both` }}>
      <div
        className={`press ${s.row} ${r.isMe ? s.rowMe : ""} ${hovered ? s.rowHov : ""} ${expanded ? s.rowOpen : ""}`}
        onMouseEnter={() => {
          setHovered(true);
          playHover();
        }}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          playClick();
          setExpanded((v) => !v);
        }}
      >
        <div className={`v ${s.rankBox} ${hovered ? s.rankBoxHov : ""}`}>
          <div className={`t ${s.rankTxt} ${hovered ? s.rankTxtHov : ""}`}>{earned ? String(r.rank).padStart(2, "0") : "—"}</div>
        </div>
        <div className={`v`} style={{ flex: 1 }}>
          <div className={`t ${s.rowName} ${hovered ? s.rowNameHov : ""}`}>
            {r.name}
            {r.isNpc ? <span className={`ti ${s.npcTag}`}> — NPC</span> : null}
            {r.isMe ? <span className={`ti ${s.meTag}`}> ← YOU</span> : null}
          </div>
          <div className={`t ${s.rowStats}`}>
            {fame
              ? `${r.wins} WINS · ${r.seatsFought} ${r.seatsFought === 1 ? "SEAT" : "SEATS"} · RATE ${r.winRate}%`
              : `${r.losses} LOSSES · ${r.seatsFought} ${r.seatsFought === 1 ? "SEAT" : "SEATS"} · RATE ${r.winRate}%`}
          </div>
        </div>
        <div className={`v ${s.scoreCol}`}>
          <div className={`t ${s.score} ${fame ? s.scoreFame : ""}`}>{fame ? r.crownScore : r.shameScore}</div>
          <div className={`t ${s.scoreLbl}`}>{fame ? "CROWN PTS" : "SHAME PTS"}</div>
        </div>
        {/* chevron — the row opens */}
        <div className={`v ${s.rowChev} ${expanded ? s.rowChevOpen : ""}`}>
          <div className={`t ${s.rowChevTxt}`}>▶</div>
        </div>
        {/* yellow sweep wipe */}
        {hovered && <div className={`v ${s.rowSweep}`} style={{ pointerEvents: "none" }} />}
      </div>
      {expanded && (
        <div className={`v ${s.rowExpand}`}>
          {r.seats.length === 0 ? (
            <div className={`t ${s.rowExpandEmpty}`}>NO VERIFIED DUELS YET — RAW TOTALS ONLY</div>
          ) : (
            <div className={`v ${s.seatChips}`}>
              {r.seats.map((seat) => (
                <div
                  key={seat.id}
                  className={`v ${s.seatChip} ${seat.w > seat.l ? s.seatChipWin : seat.l > seat.w ? s.seatChipLoss : ""}`}
                >
                  <div className={`t ${s.seatChipRank}`}>{SEAT_GLYPHS[seat.id - 1] ?? seat.id}♣</div>
                  <div className={`t ${s.seatChipRec}`}>
                    {seat.w}W · {seat.l}L{seat.d ? ` · ${seat.d}D` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={`t ${s.rowExpandNote}`}>
            {fame
              ? "CROWN PTS = WINS × SEAT TIER — THE ACE IS WORTH 13 KLEINS"
              : "SHAME PTS = LOSSES × (14 − SEAT TIER) — THE 2♣ HURTS MOST"}
          </div>
        </div>
      )}
    </div>
  );
}
