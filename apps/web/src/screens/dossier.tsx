/* DOSSIER — vertical DOSSIER left, selector beside it left, paper right (scrollable selector), Persona accents */
import { IonPage } from "@ionic/react";
import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { playHover, playClick } from "../lib/sfx";
import { P5Back } from "../components/P5Back";
import { P5Image } from "../components/P5Image";
import s from "./dossier.module.css";

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

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const rankOf = (id: number) => RANKS[id - 1] ?? String(id);

const PORTRAITS: Record<number, string> = {
  1: "/students-portrait/2clubs-portrait.png",
  2: "/students-portrait/3-clubs-portrait.png",
  3: "/students-portrait/4-clubs-portrait.png",
  4: "/students-portrait/5-clubs-portrait.png",
  5: "/students-portrait/6-clubs-portrait.png",
  6: "/students-portrait/7-clubs-portrait.png",
  7: "/students-portrait/8-clubs-portrait.png",
  8: "/students-portrait/9-clubs-portrait.png",
  9: "/students-portrait/10-clubs-portrait.png",
  10: "/students-portrait/jack-clubs-portrait.png",
  11: "/students-portrait/queen-clubs-portrait.png",
  12: "/students-portrait/king-clubs-portrait.png",
  // seat 13 has no art yet — blank, never another student's face
};
const portraitFor = (id: number) => PORTRAITS[id] ?? "";

const DOSSIER: Record<
  number,
  {
    name: string;
    fullName: string;
    age: number;
    gender: string;
    birthday: string;
    bloodType: string;
    position: string;
    division: string;
    status: string;
    associates: string[];
    quote: string;
    lore: string;
  }
> = {
  1: {
    name: "KLEIN PIERCE", fullName: "Klein Pierce", age: 18, gender: "M", birthday: "Mar 14", bloodType: "A",
    position: "2 of Clubs ♣", division: "THE THIRTEEN", status: "Alive", associates: ["HAYDEN PIERCE"],
    quote: "“Was I that easy to read?”",
    lore: "Lowest of the thirteen — by choice. Out of 200+ first-years he still landed in the top 13, and he chose the bottom. Affable, easy to talk to, and very misleading. His younger brother Hayden is two seats above him; the Pierces turn every challenge into a family argument.",
  },
  2: { name: "SATO GRAY", fullName: "Sato Gray", age: 18, gender: "M", birthday: "Jun 02", bloodType: "O",
    position: "3 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["KLEIN PIERCE", "HAYDEN PIERCE"],
    quote: "“Sweetheart, sit. I’ll pour after you win something.”",
    lore: "Immaculate, unhurried, and almost impossible to impress. Everyone may sit at his table; almost no one gets to belong at it. He offers every challenger tea and rarely pours it. Klein is the only first-year he calls by name — usually while explaining to someone else why that was a mistake.",
  },
  3: { name: "NATHALIE SINCLAIR", fullName: "Nathalie Sinclair", age: 17, gender: "F", birthday: "Nov 18", bloodType: "B",
    position: "4 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["CROWN"],
    quote: "“The ledger says no. The ledger always says no.”",
    lore: "Audits the thirteen's seat ledger and has never misplaced a number. She trusts columns more than people and enjoys finding the one error nobody else caught. Your file is blank, which she treats as an insult to bookkeeping. One win buys a line in the ledger. Respect takes a margin she can verify.",
  },
  4: { name: "JAXEN VOSS", fullName: "Jaxen Voss", age: 18, gender: "M", birthday: "Jan 09", bloodType: "AB",
    position: "5 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["KLEIN PIERCE", "HAYDEN PIERCE"],
    quote: "“The hell are you waiting for? You came here to fight, didn’t you?”",
    lore: "A brawler with a seat on the chart and no manners to go with it. Arguments end when someone hits the floor, and he is happy to volunteer. The card table frustrates him: no swinging, no charging, just paper and rules. He respects the ones who keep getting up. Try to be one of them.",
  },
  5: { name: "HAYDEN PIERCE", fullName: "Hayden Pierce", age: 17, gender: "M", birthday: "Aug 22", bloodType: "O",
    position: "6 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["KLEIN PIERCE"],
    quote: "“There it is. That little change in your face. I was wondering when you’d get scared.”",
    lore: "Klein's younger brother, and the one the teachers mention only once. He watches people until he finds the exact moment confidence turns into fear, then smiles like he was promised it. Everything is a joke right up until it isn't. He adores his brother. That is not the comforting fact it sounds like.",
  },
  6: { name: "HYACINTH SOLACE", fullName: "Hyacinth Solace", age: 18, gender: "F", birthday: "Feb 11", bloodType: "A",
    position: "7 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["KLEIN PIERCE"],
    quote: "“I’ll be cheering for you — just not across this table yet.”",
    lore: "Everyone's favorite, and she earned it honestly: warm without being soft, competitive without being cruel. She remembers what people say and shows up when it matters. She'd rather cheer than fight — but when she finally sits down, she plays straight. Kindness is not a handicap she intends to use.",
  },
  7: { name: "YANA VASILEVSKAYA", fullName: "Yana Vasilevskaya", age: 17, gender: "F", birthday: "May 30", bloodType: "B",
    position: "8 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["TRISTAN TRISTESSE", "NOIR HIRAYUKI"],
    quote: "“Oh? You came all this way just to see me? Should I tell them you said that?”",
    lore: "The institute's self-appointed cupid, and a menace about it. She knows who waited after class for whom and weaponizes every blush. Rumors, setups, badly timed confessions — all fair game. She plays people against their own hearts and laughs like it was love all along. Yours is next.",
  },
  8: { name: "TRISTAN TRISTESSE", fullName: "Tristan Tristesse", age: 17, gender: "M", birthday: "Oct 04", bloodType: "AB",
    position: "9 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["YANA VASILEVSKAYA", "NOIR HIRAYUKI", "CROWN"],
    quote: "“There’s no need to look so offended. Wanting something badly has never made anybody worthy of it.”",
    lore: "Soft-spoken, gracious, and absolutely certain he is right. He treats the thirteen as a necessary order and everyone below it as an argument he has already won. He will compliment your effort while explaining why it does not matter. His warmth is real. So is the contempt underneath it.",
  },
  9: { name: "NOIR HIRAYUKI", fullName: "Noir Hirayuki", age: 18, gender: "M", birthday: "Dec 12", bloodType: "O",
    position: "10 of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["TRISTAN TRISTESSE", "YANA VASILEVSKAYA", "CROWN"],
    quote: "“I’m tired. That isn’t an excuse — just a fact.”",
    lore: "Three phones, four hours of sleep, and every form the thirteen generate. He volunteered once and has been “the reliable one” ever since. Tie undone, eyes half-shut, patience long gone — the refusal is a sigh, not a scheme. He still shows up when it counts. He just resents every minute of it.",
  },
  10: { name: "ANTHONY KRUGER", fullName: "Anthony Kruger", age: 18, gender: "M", birthday: "Nov 08", bloodType: "AB",
    position: "Jack of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["Cecilia Rose", "Reeve Vasilevsky"],
    quote: "“Everything I grant has a line under it. Read it before you sign.”",
    lore: "Vertex runs on favors, and every favor crosses Anthony's desk first. He grants them the way a bank grants a loan: kindly, precisely, with terms nobody reads until they are due. Always one hand behind his back; nobody has ever seen what it holds. His files are the most complete in the institute. Yours just opened.",
  },
  11: { name: "CECILIA ROSE", fullName: "Cecilia Rose", age: 17, gender: "F", birthday: "Mar 03", bloodType: "A",
    position: "Queen of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["Anthony Kruger", "Yana Vasilevskaya"],
    quote: "“I would NEVER lie to you, cutie. I just don't say everything out loud!”",
    lore: "The sweetest girl in the yearbook, and the reason half of it got rewritten. Collects secrets the way other girls collect ribbons and repays every kindness with interest. Her compliments are measurements. Everyone leaves her table feeling flattered and vaguely robbed, and somehow comes back for more.",
  },
  12: { name: "REEVE VASILEVSKY", fullName: "Reeve Vasilevsky", age: 18, gender: "M", birthday: "Jan 27", bloodType: "O",
    position: "King of Clubs", division: "THE THIRTEEN", status: "Sealed", associates: ["Anthony Kruger", "Yana Vasilevskaya", "CROWN"],
    quote: "“Take your time. Every mistake you make is already priced in.”",
    lore: "Calm the way deep water is calm; the strategist the other seats quietly study. Plays every duel like a position decided in advance and never gloats when it lands. Yana's older brother — the one chaos his composure cannot organize. He has already evaluated your file. The last page is blank, and he finds that promising.",
  },
  13: { name: "CROWN", fullName: "—", age: 18, gender: "M", birthday: "Jan 01", bloodType: "B",
    position: "Ace of Clubs", division: "THE THIRTEEN", status: "Top Secret", associates: ["NATHALIE SINCLAIR", "TRISTAN TRISTESSE", "NOIR HIRAYUKI", "REEVE VASILEVSKY"],
    quote: "“The throne doesn’t notice ants. Earn a crown first.”",
    lore: "President of the student council and the seat every other seat measures itself against. Treats the twelve below as stepping stones; remembers the 2♣ as the first stone. Tristan edits his speeches, Nathalie audits his books, Noir files his paperwork, and Reeve has already evaluated the endgame of everyone who will ever sit across from him.",
  },
};

export default function Dossier() {
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
            PULLING THE FILES…
          </div>
        </div>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        {/* keyframes for paper slide + hover accents */}
        <style>{`@keyframes dossierPaperIn{0%{opacity:0;transform:translateY(110vh) rotate(1deg) scale(0.96) skewX(-0.6deg)}55%{opacity:1;transform:translateY(-14px) rotate(-0.8deg) scale(1.02) skewX(-0.6deg)}100%{opacity:1;transform:translateY(0) rotate(-0.6deg) skewX(-0.6deg)}}@keyframes p5-burstSpin{from{transform:rotate(45deg)}to{transform:rotate(405deg)}}@keyframes dossierTapeWiggle{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(-1deg)}}@keyframes p5-tabIn{0%{opacity:0}100%{opacity:1}}@keyframes float3d{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}@keyframes idIn{0%{opacity:0;transform:translateX(380%) rotateY(360deg) scale(0.72)}62%{opacity:1;transform:translateX(-30px) rotateY(-10deg) scale(1.07)}100%{opacity:1;transform:none}}@keyframes shadowBob{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(0.8);opacity:0.55}}`}</style>

        {/* ===== stage accents — persona soup so container never feels flat ===== */}
        <div className={`v ${s.envSlashL}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.envSlashLIn}`} style={{ animation: "p5-slashA 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>
        <div className={`v ${s.envSlashR}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.envSlashRIn}`} style={{ animation: "p5-slashB 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>

        <div className={`v ${s.burst}`} style={{ pointerEvents: "none" }} />
        <div className={`t ${s.ghost}`} style={{ pointerEvents: "none" }}>13</div>
        <div className={`v ${s.halftoneA}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.halftoneB}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.halftoneC}`} style={{ pointerEvents: "none" }} />

        {/* speedline bands */}
        <div className={`v ${s.linesWrap}`} style={{ pointerEvents: "none" }}>
          {[
            { top: "22%", h: 5, dur: "10s", col: "rgba(252,238,33,0.11)", d: "0s" },
            { top: "71%", h: 3, dur: "14s", col: "rgba(255,255,255,0.06)", d: "1s" },
            { top: "48%", h: 4, dur: "12s", col: "rgba(230,0,18,0.10)", d: "0.6s" },
          ].map((L, i) => (
            <div key={i} className={`v`} style={{ position: "absolute", left: "-20%", right: "-20%", top: L.top, height: L.h, overflow: "hidden" }}>
              <div className={`v`} style={{ flexDirection: "row", width: "200%", transform: "skewX(-16deg)" }}>
                {[0, 1].map((half) => (
                  <div
                    key={half}
                    className={`v`}
                    style={{
                      width: "100%",
                      backgroundImage: `repeating-linear-gradient(90deg, ${L.col} 0 46px, transparent 46px 110px)`,
                      height: L.h,
                      animation: `p5-marquee${half ? "" : " reverse"} ${L.dur} linear infinite`,
                      animationDelay: L.d,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* floating diamonds */}
        <div className={`v`} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
          {[
            { t: "14%", l: "44%", sz: 13, d: "0s", c: "#E60012" },
            { t: "78%", l: "16%", sz: 10, d: "1.1s", c: "#FCEE21" },
            { t: "18%", l: "88%", sz: 14, d: "0.7s", c: "#FCEE21" },
            { t: "82%", l: "72%", sz: 11, d: "1.8s", c: "#FFFFFF" },
          ].map((dm, i) => (
            <div
              key={i}
              className={`t ${s.diamond}`}
              style={{ top: dm.t, left: dm.l, fontSize: dm.sz, color: dm.c, animationDelay: dm.d }}
            >
              ◆
            </div>
          ))}
        </div>

        {/* drifting glyphs */}
        <div className={`v`} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
          {[
            { ch: "✕", t: "19%", l: "31%", sz: 30, o: 0.08 },
            { ch: "!", t: "62%", l: "26%", sz: 38, o: 0.06 },
            { ch: "◆", t: "11%", l: "76%", sz: 22, o: 0.07 },
          ].map((g, i) => (
            <div
              key={i}
              className={`t ${s.driftGlyph}`}
              style={{
                top: g.t,
                left: g.l,
                fontSize: g.sz,
                opacity: g.o,
                animationDuration: `${5 + i}s`,
                animationDelay: `${-i * 0.9}s`,
              }}
            >
              {g.ch}
            </div>
          ))}
        </div>

        {/* hazard tape bottom like shame */}
        <div className={`v ${s.tapeFloor}`} style={{ pointerEvents: "none" }}>
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

        <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 }} />

        <EnhancedDossier data={data} />
      </div>
    </IonPage>
  );
}

function EnhancedDossier({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  const firstOpen = data.students.find((st) => st.id <= nextId) ?? data.students[0];
  const [sel, setSel] = useState<number>(firstOpen.id);
  const cur = data.students.find((st) => st.id === sel)!;
  const locked = cur.id > nextId;
  const d = DOSSIER[cur.id] ?? DOSSIER[1];
  const [view3d, setView3d] = useState(false);

  // persona offsets — intentionally messy like OPTIONS, not perfectly vertical
  const TAB_OFF = [0, 14, -9, 16, -5, 18, 4, -11, 9, -7, 13, -8, 6];
  const TITLE_OFF = [
    { rot: -2.4, x: -6 },
    { rot: 1.9, x: 5 },
    { rot: -1.8, x: -4 },
    { rot: 1.6, x: 6 },
    { rot: -2.1, x: -5 },
    { rot: 1.7, x: 4 },
    { rot: -1.2, x: 0 },
  ];

  return (
    <div className={`v ${s.wrap}`}>
      {/* vertical DOSSIER — intentionally a little crooked, like OPTIONS */}
      <div className={`v ${s.titleCol}`}>
        {["D", "O", "S", "S", "I", "E", "R"].map((ch, i) => {
          const to = TITLE_OFF[i];
          return (
            <div
              key={i}
              className={`t ${s.vLetter} ${i % 3 === 0 ? s.vLetterC : ""} ${i % 3 === 2 ? s.vLetterY : ""}`}
              style={{
                transform: `rotate(${to.rot}deg) translateX(${to.x}px) skewX(-6deg)`,
                animation: `p5-logoLetter 560ms ${70 + i * 55}ms cubic-bezier(0.16,1,0.3,1) both`,
              }}
            >
              {ch}
            </div>
          );
        })}
        {/* view mode toggle — FILE vs 3D ID */}
        <div className={`v ${s.idToggleWrap}`}>
          <div
            className={`press ${s.idToggleBtn} ${!view3d ? s.idToggleBtnOn : ""}`}
            onMouseEnter={playHover}
            onClick={() => {
              playClick();
              setView3d(false);
            }}
          >
            <div className={`t ${s.idToggleTxt} ${!view3d ? s.idToggleTxtOn : ""}`}>FILE</div>
          </div>
          <div
            className={`press ${s.idToggleBtn} ${view3d ? s.idToggleBtnOn : ""}`}
            onMouseEnter={playHover}
            onClick={() => {
              playClick();
              setView3d(true);
            }}
          >
            <div className={`t ${s.idToggleTxt} ${view3d ? s.idToggleTxtOn : ""}`}>3D ID</div>
          </div>
        </div>
      </div>

      {/* selector — finalized combined card (S1 rank block + S2 file header/seal + S3 white name-bar) */}
      <div className={`v ${s.selectorWrap}`}>
        <div className={`v ${s.selectorScroll} noscroll`}>
          <div className={`v ${s.selectorContent}`}>
            {data.students.map((st, i) => {
              const on = st.id === sel;
              const r = rankOf(st.id);
              const off = TAB_OFF[i];
              const studentName = DOSSIER[st.id]?.name ?? `SEAT ${String(st.id).padStart(2, "0")}`;

              // FINAL COMBINED — S1 crimson rank block + S2 red file header & diamond seal + S3 white name-bar
              return (
                <DossierTab
                  key={st.id}
                  st={st}
                  i={i}
                  on={on}
                  r={r}
                  off={off}
                  studentName={studentName}
                  onSelect={() => {
                    if (st.id === sel) playHover();
                    else {
                      playClick();
                      setSel(st.id);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* paper / 3D ID — swap by view mode */}
      <div className={`v ${s.paperCol}`}>
        {view3d ? (
          <IdCard3D key={"id-" + sel} cur={cur} d={d} locked={locked} variant={3} />
        ) : (
          <div className={`v ${s.docAnimWrap}`} key={sel} style={{ animation: "dossierPaperIn 620ms cubic-bezier(0.16,1,0.3,1) both" }}>
            <DocPaper cur={cur} d={d} locked={locked} />
          </div>
        )}
      </div>
    </div>
  );
}

function DossierTab({
  st,
  i,
  on,
  r,
  off,
  studentName,
  onSelect,
}: {
  st: StudentRow;
  i: number;
  on: boolean;
  r: string;
  off: number;
  studentName: string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered;
  return (
    <div
      className={`press ${s.tab} ${s.tabCombo} ${on ? s.tabComboOn : ""} ${active && !on ? s.tabComboHov : ""} ${
        pressed ? s.tabComboDown : ""
      }`}
      style={{
        marginLeft: off,
        transform: pressed
          ? "skewX(-2deg) translateY(3px) scale(0.9)"
          : active && !on
            ? "skewX(-2deg) translateY(-9px) scale(1.07)"
            : "skewX(-2deg)",
        transition:
          "transform 200ms cubic-bezier(0.34,1.56,0.64,1), border-color 160ms, box-shadow 180ms, background-color 160ms, filter 180ms",
        animation: `p5-tabIn 430ms ${70 + i * 28}ms both`,
      }}
      onMouseEnter={() => {
        setHovered(true);
        playHover();
      }}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onSelect}
    >
      {/* crimson rank tile (counter-skewed so it stays upright) */}
      <div className={`v ${s.cRankTile} ${on ? s.cRankTileOn : ""} ${hovered && !on ? s.cRankTileHov : ""}`}>
        <div className={`t ${s.cRankNum} ${on || hovered ? s.cRankNumOn : ""}`}>{r}</div>
      </div>
      <div className={`v ${s.cBody}`}>
        <div
          className={`t ${s.cName} ${on ? s.cNameOn : ""}`}
          style={{ fontSize: studentName.length > 14 ? 19 : studentName.length > 10 ? 22 : 26 }}
        >
          {studentName}
        </div>
      </div>
      <div className={`t ${s.cArrow} ${hovered || on ? s.cArrowOn : ""}`}>▶</div>
      <div className={`v ${s.cLine} ${on ? s.cLineOn : ""}`} style={{ pointerEvents: "none" }} />
      {pressed && <div className={`v ${s.cFlash}`} style={{ pointerEvents: "none" }} />}
    </div>
  );
}

function DocPaper({ cur, d, locked }: { cur: StudentRow; d: any; locked: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <div
      className={`press ${s.doc} ${hovered ? s.docHover : ""} ${pressed ? s.docPressed : ""}`}
      style={{
        transition: "transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms, filter 220ms",
      }}
      onMouseEnter={() => {
        setHovered(true);
        playHover();
      }}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onClick={() => playClick()}
    >
      <div className={`t ${s.watermark}`} style={{ pointerEvents: "none" }}>
        CONFIDENTIAL
      </div>
      <div
        className={`v ${s.tape}`}
        style={{ pointerEvents: "none", ...(hovered ? { animation: "dossierTapeWiggle 0.6s ease-in-out" } : null) }}
      />
      <div className={`v ${s.clip}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.ring}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.docHalftone}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.docHalftoneB}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.docSlash}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.docSpeed}`} style={{ pointerEvents: "none" }} />

      <div className={`v ${s.docHead}`}>
        <div className={`v`} style={{ flex: 1 }}>
          <div className={`t ${s.docKicker}`}>FILE NO. {String(cur.id).padStart(3, "0")} — {d.position.toUpperCase()}</div>
          <div
            className={`t ${s.docTitle}`}
            style={d.name.length > 14 ? { fontSize: 40, lineHeight: "44px" } : undefined}
          >
            {d.name}
          </div>
          <div className={`t ${s.docSub}`}>{locked ? "████████ — ██" : d.division === "—" ? d.fullName : `${d.fullName} · ${d.division}`}</div>
        </div>
        <div className={`v ${s.stamp} ${locked ? s.stampSealed : ""} ${hovered ? s.stampHover : ""}`}>
          <div className={`t ${s.stampTxt} ${locked ? s.stampTxtSealed : ""}`}>{locked ? "SEALED" : cur.cleared ? "PACIFIED" : "TOP SECRET"}</div>
        </div>
      </div>

      <div className={`v ${s.docBody}`}>
        <div className={`v ${s.left}`}>
          <div className={`v ${s.photo} ${hovered && !pressed ? s.photoHover : ""}`}>
            {locked ? (
              <>
                <div className={`v ${s.photoRedact}`} />
                <div className={`t ${s.photoQ}`}>?</div>
                <div className={`t ${s.photoNo}`}>NO PHOTO ON RECORD</div>
              </>
            ) : portraitFor(cur.id) ? (
              <>
                <P5Image src={portraitFor(cur.id)} resizeMode="cover" className={s.photoImg} />
                <div className={`v ${s.photoTag}`}>
                  <div className={`t ${s.photoTagTxt}`}>ID PHOTO — 2×2 — ON FILE</div>
                </div>
                <div className={`v ${s.photoGrid}`} style={{ pointerEvents: "none" }} />
                {/* yellow corner nick */}
                <div className={`v ${s.photoCorner}`} style={{ pointerEvents: "none" }} />
              </>
            ) : (
              <>
                <div className={`v ${s.photoRedact}`} />
                <div className={`t ${s.photoQ}`}>?</div>
                <div className={`t ${s.photoNo}`}>NO PHOTO ON RECORD</div>
              </>
            )}
          </div>

          <div className={`v ${s.miniGrid}`}>
            {[
              ["AGE", locked ? "██" : String(d.age)],
              ["GENDER", locked ? "██" : d.gender],
              ["BIRTHDAY", locked ? "████" : d.birthday],
              ["BLOOD", locked ? "█" : d.bloodType],
            ].map(([k, v]) => (
              <div key={k} className={`v ${s.miniCell}`}>
                <div className={`t ${s.miniLabel}`}>{k}</div>
                {locked ? <div className={`v ${s.miniRedact}`} /> : <div className={`t ${s.miniVal}`}>{v}</div>}
              </div>
            ))}
          </div>

          {cur.id !== 1 && (
            <>
              <div className={`v ${s.threatRow}`}>
                <div className={`t ${s.threatLabel}`}>THREAT</div>
                <div className={`v ${s.threatPips}`}>
                  {Array.from({ length: 13 }).map((_, p) => (
                    <div key={p} className={`v ${s.pip} ${p < cur.tier ? s.pipOn : ""} ${locked ? s.pipLocked : ""}`} />
                  ))}
                </div>
              </div>

              <div className={`v ${s.record}`}>
                {locked ? (
                  <div className={`v ${s.recordRedact}`} />
                ) : (
                  <div className={`t ${s.recordTxt}`}>
                    {cur.wins}W · {cur.losses}L · {cur.attempts} RUNS · BEST {cur.bestScore}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={`v ${s.right}`}>
          <div className={`v ${s.fieldGrid}`}>
            {[
              ["FULL NAME", locked ? "████████ █." : d.fullName],
              ["POSITION", d.position],
              ...(d.division === "—" ? [] : ([["DIVISION", locked ? "████████ — ██████" : d.division]] as any)),
              ["STATUS", locked ? "SEALED" : d.status],
            ].map(([label, val]) => (
              <div key={label} className={`v ${s.field}`}>
                <div className={`t ${s.fieldLabel}`}>{label}</div>
                {locked && label !== "POSITION" ? <div className={`v ${s.fieldRedact}`} /> : <div className={`t ${s.fieldVal}`}>{val}</div>}
              </div>
            ))}
          </div>

          {!locked && d.associates.length === 0 ? null : (
            <div className={`v ${s.associates}`}>
              <div className={`t ${s.associatesLabel}`}>KNOWN ASSOCIATES</div>
              <div className={`v ${s.assocRow}`}>
                {(locked ? ["—", "—", "—"] : d.associates).map((name: string, idx: number) => (
                  <div key={idx} className={`v ${s.assocChip} ${locked ? s.assocChipLocked : ""}`}>
                    <div className={`t ${s.assocTxt} ${locked ? s.assocTxtLocked : ""}`}>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`v ${s.quoteBox}`}>
            <div className={`t ${s.quoteMark}`}>“</div>
            {locked ? <div className={`v ${s.quoteRedact}`} /> : <div className={`t ${s.quote}`}>{d.quote}</div>}
          </div>

          <div className={`v ${s.caseBox}`}>
            <div className={`v ${s.caseHead}`}>
              <div className={`t ${s.caseLabel}`}>CASE NOTES — HANDLER</div>
              <div className={`v ${s.caseLine}`} />
              {/* tiny hard badge */}
              <div className={`v ${s.caseBadge}`}>
                <div className={`t ${s.caseBadgeTxt}`}>EYES ONLY</div>
              </div>
            </div>
            {locked ? (
              <div className={`v ${s.caseRedactCol}`}>
                <div className={`v ${s.caseRedact}`} />
                <div className={`v ${s.caseRedact}`} style={{ width: "82%" }} />
                <div className={`v ${s.caseRedact}`} style={{ width: "64%" }} />
              </div>
            ) : (
              <div className={`t ${s.caseText}`}>{d.lore}</div>
            )}
          </div>
        </div>
      </div>

      <div className={`v ${s.idStrip}`}>
        <div className={`v ${s.idLeft}`}>
          <div className={`t ${s.idLabel}`}>FILE</div>
          <div className={`t ${s.idVal}`}>
            {String(cur.id).padStart(2, "0")}–{rankOf(cur.id)}♣
          </div>
        </div>
        <div className={`v ${s.idMid}`}>
          <div className={`t ${s.idLabel}`}>DIVISION</div>
          <div className={`t ${s.idVal}`} style={{ fontSize: 10 }}>{locked ? "—" : d.division.split(" —")[0]}</div>
        </div>
        <div className={`v ${s.idRight}`}>
          <div className={`t ${s.idLabel}`}>ISSUED</div>
          <div className={`t ${s.idVal}`}>2026-08-24</div>
        </div>
        <div className={`v ${s.idBarcode}`}>
          {Array.from({ length: 18 }).map((_, bi) => (
            <div key={bi} className={`v ${s.idBar}`} style={{ width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.2 : 1 }} />
          ))}
        </div>
      </div>

      <div className={`t ${s.foot}`}>HANDLE WITH CARE — PROPERTY OF THE STUDENT COUNCIL — DO NOT DUPLICATE</div>

      {/* bottom yellow hard stripe */}
      <div className={`v ${s.docBottomBar} ${hovered ? s.docBottomBarHov : ""}`} style={{ pointerEvents: "none" }} />
    </div>
  );
}

/* ===== 3D floating ID card — perspective + preserve-3d, drag to tilt/rotate, click to flip =====
   (the Expo build rendered a raw <div> for web — carried over 1:1; the RN-native
   fallback branch was never reachable in the web-only app) */
function IdCard3D({ cur, d, locked, variant = 1 }: { cur: StudentRow; d: any; locked: boolean; variant?: number }) {
  const [rot, setRot] = useState({ x: -8, y: 18 });
  const rotRef = useRef(rot);
  rotRef.current = rot;
  const flippedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ px: number; py: number; rx: number; ry: number } | null>(null);
  const movedRef = useRef(false);

  // proven web pattern: perspective container + pointer tracking + backface-hidden faces.
  // drag starts from React mouse/pointer props, move/up tracked on window (no ref-to-DOM dependency)
  const startDrag = (e: any) => {
    if (dragRef.current) return;
    const ev = (e.nativeEvent ?? e) as PointerEvent;
    if (typeof ev.clientX !== "number") return;
    dragRef.current = { px: ev.clientX, py: ev.clientY, rx: rotRef.current.x, ry: rotRef.current.y };
    movedRef.current = false;
    setDragging(true);
    const move = (m: PointerEvent) => {
      const g = dragRef.current;
      if (!g) return;
      const dx = m.clientX - g.px;
      const dy = m.clientY - g.py;
      if (Math.abs(dx) + Math.abs(dy) > 6) movedRef.current = true;
      setRot({
        x: Math.max(-80, Math.min(80, g.rx - dy * 0.32)),
        y: g.ry + dx * 0.4,
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const wasMoved = movedRef.current;
      dragRef.current = null;
      setDragging(false);
      if (!wasMoved) {
        flippedRef.current = !flippedRef.current;
        const base = Math.round(rotRef.current.y / 360) * 360;
        setRot({ x: -8, y: base + (flippedRef.current ? 180 : 0) });
        playClick();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const bars = Array.from({ length: 24 });
  const alt = variant === 2 || variant === 3;
  const fLabel = alt ? { color: "rgba(245,239,225,0.7)" } : undefined;
  const fVal = alt ? { color: "#f5efe1" } : undefined;
  const fDot = alt ? { borderTopColor: "rgba(245,239,225,0.3)" } : undefined;
  const fFace = variant === 2 ? { backgroundColor: "#0A1931", borderColor: "#D4AF37" } : variant === 3 ? { backgroundColor: "#0A0A0A", borderColor: "#E60012" } : undefined;

  return (
    <div className={`v ${s.idStage}`}>
      <div className={`v ${s.idEnter}`} style={{ animation: "idIn 2200ms cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className={`v ${s.idShadow}`} style={{ animation: "shadowBob 5.2s ease-in-out infinite", pointerEvents: "none" }} />
        <div className={`v ${s.idBob}`} style={{ animation: "float3d 5.2s ease-in-out infinite" }}>
          <div
            onPointerDown={startDrag}
            style={{
              width: 440,
              height: 640,
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `perspective(1400px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
              transition: dragging ? "none" : "transform 650ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* FRONT — portrait ID */}
            <div className={`v ${s.idFace} ${s.idFaceFront}`} style={fFace}>
              <div className={`v ${s.idTopBar}`}>
                {/* unstyled in the Expo build too — bare View defaults */}
                <div className="v">
                  <div className={`v ${s.idCrest}`} />
                  <div className={`t ${s.idSchoolTxt}`}>VERTEX INSTITUTE</div>
                </div>
                <div className="v">
                  <div className="t">STUDENT · 2026</div>
                </div>
              </div>

              <div className={`v ${s.idMainRow}`}>
                <div className={`v ${s.idPhotoWrap}`}>
                  <div className={`v ${s.idPhotoTape}`} />
                  {locked ? (
                    <div className={`v ${s.idPhotoEmpty}`}>
                      <div className={`t ${s.idPhotoQ}`}>?</div>
                    </div>
                  ) : (
                    <P5Image src={portraitFor(cur.id)} resizeMode="cover" className={s.idPhotoImg} />
                  )}
                </div>

                <div className={`v ${s.idFields}`}>
                  <div className={`t ${s.idCardLabel}`} style={fLabel}>STUDENT NAME</div>
                  <div className={`t ${s.idName}`} style={fVal}>{locked ? "████████ ██." : d.fullName}</div>
                  <div className={`v ${s.idNameRule}`} style={variant === 2 || variant === 3 ? { backgroundColor: "#f5efe1" } : undefined} />
                  <div className={`t ${s.idCardLabel}`} style={fLabel}>SECTION</div>
                  <div className={`t ${s.idSection}`} style={fVal}>{locked ? "██████" : d.division.split(" —")[0]}</div>
                </div>
              </div>

              <div className={`v ${s.idBottomBar}`}>
                <div className={`t ${s.idNo}`}>NO. VI-{String(cur.id).padStart(4, "0")}</div>
                <div className={`v ${s.idCardBarcode}`}>
                  {bars.map((_, bi) => (
                    <div key={bi} className={`v ${s.idCardBar}`} style={{ width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.25 : 1 }} />
                  ))}
                </div>
                <div className={`t ${s.idMicro}`}>IF FOUND, RETURN</div>
              </div>

              <div className={`v ${s.idSheen}`} style={{ pointerEvents: "none" }} />
              <div className={`v ${s.idHalftone}`} style={{ pointerEvents: "none" }} />
              <div className={`t ${s.idHint}`}>HOLD + DRAG · CLICK TO FLIP</div>
            </div>

            {/* BACK — portrait detailed */}
            <div className={`v ${s.idFace} ${s.idFaceBack}`} style={fFace}>
              <div className={`v ${s.idMagStripe}`} />
              <div className={`v`} style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 12, alignItems: "center" }}>
                <div className={`t`} style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: 3, color: "#E60012" }}>STUDENT RECORD</div>
                <div className={`v`} style={{ height: 2, width: 60, backgroundColor: "#E60012", marginTop: 4, transform: "skewX(-20deg)" }} />
              </div>
              {variant === 3 && (
                <>
                  <div
                    className={`t`}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 62,
                      fontFamily: "Anton, sans-serif",
                      fontSize: 140,
                      color: "rgba(230,0,18,0.07)",
                      transform: "rotate(-12deg)",
                      pointerEvents: "none",
                    }}
                  >
                    {rankOf(cur.id)}
                  </div>
                  <div
                    className={`v`}
                    style={{
                      position: "absolute",
                      top: 44,
                      left: -20,
                      right: -20,
                      height: 3,
                      backgroundColor: "#E60012",
                      transform: "rotate(-2deg)",
                      opacity: 0.9,
                      pointerEvents: "none",
                    }}
                  />
                </>
              )}
              <div className={`v ${s.idBackGrid}`}>
                <div className={`v ${s.idBackCol}`}>
                  {[
                    ["BIRTHDAY", d.birthday],
                    ["BLOOD TYPE", d.bloodType],
                    ["GENDER", d.gender],
                  ].map(([k, v]) => (
                    <div key={k} className={`v ${s.idFRow}`}>
                      <div className={`t ${s.idFLabel}`} style={fLabel}>{k}</div>
                      <div className={`t ${s.idFVal}`} style={fVal}>{locked ? "████" : v}</div>
                      <div className={`v ${s.idFDot}`} style={fDot} />
                    </div>
                  ))}
                </div>
                <div className={`v ${s.idBackCol}`}>
                  {[
                    ["ISSUED", "2026-08-24"],
                    ["VALID THRU", "2027-08-24"],
                    ["STATUS", locked ? "SEALED" : d.status],
                  ].map(([k, v]) => (
                    <div key={k} className={`v ${s.idFRow}`}>
                      <div className={`t ${s.idFLabel}`} style={fLabel}>{k}</div>
                      <div className={`t ${s.idFVal}`} style={fVal}>{locked ? "████" : v}</div>
                      <div className={`v ${s.idFDot}`} style={fDot} />
                    </div>
                  ))}
                </div>
              </div>
              <div className={`v ${s.idQr}`} style={{ backgroundColor: "#FFFFFF", padding: 6, pointerEvents: "none" }}>
                {Array.from({ length: 81 }).map((_, q) => {
                  const r = Math.floor(q / 9);
                  const c = q % 9;
                  const isFinder = r < 3 && c < 3 || r < 3 && c > 5 || r > 5 && c < 3;
                  const isFinderInner =
                    isFinder && r % 3 === 1 && c % 3 === 1 && !(r < 3 && c < 3 && r === 1 && c === 1 || r < 3 && c > 5 && r === 1 && c === 7 || r > 5 && c < 3 && r === 7 && c === 1);
                  // finder border vs inner
                  const on = isFinder ? (r % 2 === 0 || c % 2 === 0 ? true : r === 1 && c === 1 || r === 1 && c === 7 || r === 7 && c === 1) : ((q * 7 + c * 13) % 5) % 2 === 0;
                  return <div key={q} className={`v ${s.idQrCell} ${on ? s.idQrOn : ""}`} style={isFinderInner ? { backgroundColor: "#FFFFFF" } : undefined} />;
                })}
              </div>
              <div className={`v ${s.idBackFoot}`}>
                <div className={`t ${s.idMicroDark}`}>PROPERTY OF VERTEX · DO NOT DUPLICATE</div>
                <div className={`v ${s.idBarcodeSm}`}>
                  {Array.from({ length: 18 }).map((_, bi) => (
                    <div key={bi} className={`v ${s.idBarW}`} style={{ width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.3 : 1 }} />
                  ))}
                </div>
              </div>
              <div className={`t ${s.idHint}`} style={{ color: "rgba(255,255,255,0.35)" }}>HOLD + DRAG · CLICK TO FLIP</div>
            </div>
            <div className={`v ${s.idEdge} ${s.idEdgeRight}`} style={{ pointerEvents: "none" }} />
            <div className={`v ${s.idEdge} ${s.idEdgeLeft}`} style={{ pointerEvents: "none" }} />
            <div className={`v ${s.idEdge} ${s.idEdgeTop}`} style={{ pointerEvents: "none" }} />
            <div className={`v ${s.idEdge} ${s.idEdgeBottom}`} style={{ pointerEvents: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* IdCardSamples — carried over as dead-code parity with the Expo build (unused there too) */
function IdCardSamples() {
  return null;
}

