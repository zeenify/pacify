/* DOSSIER — vertical DOSSIER left, selector beside it left, paper right (scrollable selector), Persona accents */
import { View, Text, StyleSheet, Platform, Pressable, Image, ScrollView, Animated, PanResponder } from "react-native";
import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { api } from "../lib/api";
import { playHover, playClick } from "../lib/sfx";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

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

const portraitFor = (id: number) => {
  if (id === 1) return "/students-portrait/2clubs-portrait.png";
  if (id === 2) return "/students/3clubs.png";
  if (id === 3) return "/students/4clubs.png";
  return "/students/2clubs9x16.png";
};

const DOSSIER: Record<
  number,
  {
    codename: string;
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
    codename: "KLEIN",
    fullName: "Klein Pierce",
    age: 18,
    gender: "M",
    birthday: "Mar 14",
    bloodType: "A",
    position: "2 of Clubs ♣",
    division: "First Year — Section 1-B",
    status: "Alive",
    associates: [],
    quote: "“Was I that easy to read?”",
    lore: "Lowest of the thirteen — by choice. Out of 200+ first-years he still landed in the top 13, and he chose the bottom. Affable, easy to talk to, and very misleading. Lets you learn the table, then teaches you that you learned the wrong one.",
  },
  2: {
    codename: "COUNTER",
    fullName: "Ren K.",
    age: 18,
    gender: "M",
    birthday: "Jun 02",
    bloodType: "O",
    position: "3 of Clubs",
    division: "Logistics — Inventory",
    status: "Flagged — Aggressive",
    associates: ["2♣", "5♣", "Dowager"],
    quote: "“Say the number out loud and it stops being yours.”",
    lore: "Counts your cards for you. Out loud. When the counting stops, his hand is already better. The smile that follows scales with how badly you’ve misread the count.",
  },
  3: {
    codename: "SMILE",
    fullName: "Mika S.",
    age: 17,
    gender: "F",
    birthday: "Nov 18",
    bloodType: "B",
    position: "4 of Clubs",
    division: "Media — Photography",
    status: "Unpredictable",
    associates: ["7♣", "J♣"],
    quote: "“A bigger smile means a smaller chance.”",
    lore: "Never enters a pot without a grin. The grin is the calibration — small for value, wide for a trap. Learns your camera angle faster than your betting pattern.",
  },
  4: {
    codename: "WALL",
    fullName: "Kei T.",
    age: 18,
    gender: "F",
    birthday: "Jan 09",
    bloodType: "AB",
    position: "5 of Clubs",
    division: "Disciplinary Committee",
    status: "Sealed",
    associates: ["—"],
    quote: "“If I speak first, you’ve already lost.”",
    lore: "File sealed until you clear the three in front of her. Known to open every round with a check — except the one that matters.",
  },
  5: {
    codename: "YAWN",
    fullName: "—",
    age: 17,
    gender: "M",
    birthday: "Aug 22",
    bloodType: "O",
    position: "6 of Clubs",
    division: "Athletics — Kendo",
    status: "Sealed",
    associates: ["—"],
    quote: "“Watch the hands, not the face.”",
    lore: "Flagged for faking fatigue with premium hands. Yawn is timed to your glance, not his comfort.",
  },
  6: {
    codename: "COIN",
    fullName: "—",
    age: 18,
    gender: "M",
    birthday: "Feb 11",
    bloodType: "A",
    position: "7 of Clubs",
    division: "Finance — Ledger",
    status: "Sealed",
    associates: ["—"],
    quote: "“Heads I win. Tails you learn.”",
    lore: "Keeps a chipped 500-yen piece. Flips it only when the deck has turned cold for him.",
  },
  7: {
    codename: "HUM",
    fullName: "—",
    age: 17,
    gender: "F",
    birthday: "May 30",
    bloodType: "B",
    position: "8 of Clubs",
    division: "Music — Choir",
    status: "Sealed",
    associates: ["—"],
    quote: "“Humming is confidence. Silence is a corner.”",
    lore: "Hums under her breath when ahead. Goes dead quiet when cornered — that quiet is more dangerous than any bet.",
  },
  8: {
    codename: "APOLOGY",
    fullName: "—",
    age: 17,
    gender: "M",
    birthday: "Oct 04",
    bloodType: "AB",
    position: "9 of Clubs",
    division: "Literature — Editorial",
    status: "Sealed",
    associates: ["—"],
    quote: "“Sorry. This next part will hurt.”",
    lore: "Apologizes before every cut, every raise, every reveal. The apology is not manners — it’s timing.",
  },
  9: {
    codename: "CHIPS",
    fullName: "—",
    age: 18,
    gender: "M",
    birthday: "Dec 12",
    bloodType: "O",
    position: "10 of Clubs",
    division: "Hospitality — Service",
    status: "Sealed",
    associates: ["—"],
    quote: "“I never look at eyes. Eyes lie.”",
    lore: "Stares at your stack, never your face. Knows your remaining bullets before you do.",
  },
  10: {
    codename: "FAN",
    fullName: "—",
    age: 17,
    gender: "F",
    birthday: "Apr 19",
    bloodType: "A",
    position: "Jack of Clubs",
    division: "Theatre — Stage",
    status: "Sealed",
    associates: ["—"],
    quote: "“A broken fan is still a fan.”",
    lore: "Carries a fan with a torn rib. Repairs it — slowly — only before a winning hand.",
  },
  11: {
    codename: "LAUGH",
    fullName: "—",
    age: 18,
    gender: "M",
    birthday: "Jul 27",
    bloodType: "B",
    position: "Queen of Clubs",
    division: "Broadcast — Announce",
    status: "Sealed",
    associates: ["—"],
    quote: "“Bad draws are the funniest.”",
    lore: "Laughs at his own bad draws. The harder the laugh, the more loaded the deck is in his favor.",
  },
  12: {
    codename: "STATUE",
    fullName: "—",
    age: 18,
    gender: "M",
    birthday: "Sep 03",
    bloodType: "AB",
    position: "King of Clubs",
    division: "Disciplinary — Chair",
    status: "Sealed",
    associates: ["—"],
    quote: "“Nine rounds of nothing. The tenth is mine.”",
    lore: "Does not move for nine rounds. On the tenth, he does not play a hand — he takes the table.",
  },
  13: {
    codename: "ACE",
    fullName: "—",
    age: 18,
    gender: "—",
    birthday: "Jan 01",
    bloodType: "—",
    position: "Ace of Clubs",
    division: "Student Council — President",
    status: "Top Secret",
    associates: ["—"],
    quote: "“No one keeps a streak against me.”",
    lore: "Top of the Institute. No tell on record. Every prior challenger remembers the loss, never the play.",
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
      <View style={s.stage as any}>
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>PULLING THE FILES…</Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      {/* keyframes for paper slide + hover accents */}
      {web && (
        <View pointerEvents="none" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" } as any}>
          <style>{`@keyframes dossierPaperIn{0%{opacity:0;transform:translateY(110vh) rotate(1deg) scale(0.96) skewX(-0.6deg)}55%{opacity:1;transform:translateY(-14px) rotate(-0.8deg) scale(1.02) skewX(-0.6deg)}100%{opacity:1;transform:translateY(0) rotate(-0.6deg) skewX(-0.6deg)}}@keyframes p5-burstSpin{from{transform:rotate(45deg)}to{transform:rotate(405deg)}}@keyframes dossierTapeWiggle{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(-1deg)}}@keyframes p5-tabIn{0%{opacity:0}100%{opacity:1}}@keyframes float3d{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}@keyframes idIn{0%{opacity:0;transform:translateX(380%) rotateY(360deg) scale(0.72)}62%{opacity:1;transform:translateX(-30px) rotateY(-10deg) scale(1.07)}100%{opacity:1;transform:none}}@keyframes shadowBob{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(0.8);opacity:0.55}}`}</style>
        </View>
      )}

      {/* ===== stage accents — persona soup so container never feels flat ===== */}
      <View style={s.envSlashL as any} pointerEvents="none">
        <View style={[s.envSlashLIn as any, web && ({ animation: "p5-slashA 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>
      <View style={s.envSlashR as any} pointerEvents="none">
        <View style={[s.envSlashRIn as any, web && ({ animation: "p5-slashB 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>

      {web && <View style={s.burst as any} pointerEvents="none" />}
      {web && <Text style={s.ghost as any} pointerEvents="none">13</Text>}
      {web && <View style={s.halftoneA as any} pointerEvents="none" />}
      {web && <View style={s.halftoneB as any} pointerEvents="none" />}
      {web && <View style={s.halftoneC as any} pointerEvents="none" />}

      {/* speedline bands */}
      {web && (
        <View style={s.linesWrap as any} pointerEvents="none">
          {[
            { top: "22%", h: 5, dur: "10s", col: "rgba(252,238,33,0.11)", d: "0s" },
            { top: "71%", h: 3, dur: "14s", col: "rgba(255,255,255,0.06)", d: "1s" },
            { top: "48%", h: 4, dur: "12s", col: "rgba(230,0,18,0.10)", d: "0.6s" },
          ].map((L, i) => (
            <View key={i} style={{ position: "absolute", left: "-20%", right: "-20%", top: L.top, height: L.h, overflow: "hidden" } as any}>
              <View style={{ flexDirection: "row", width: "200%", transform: [{ skewX: "-16deg" }] } as any}>
                {[0, 1].map((half) => (
                  <View
                    key={half}
                    style={[
                      { width: "100%", backgroundImage: `repeating-linear-gradient(90deg, ${L.col} 0 46px, transparent 46px 110px)`, height: L.h } as any,
                      web && ({ animation: `p5-marquee${half ? "" : " reverse"} ${L.dur} linear infinite`, animationDelay: L.d } as any),
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* floating diamonds */}
      {web && (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 } as any} pointerEvents="none">
          {[
            { t: "14%", l: "44%", s: 13, d: "0s", c: theme.color.crimson },
            { t: "78%", l: "16%", s: 10, d: "1.1s", c: theme.color.yellow },
            { t: "18%", l: "88%", s: 14, d: "0.7s", c: theme.color.yellow },
            { t: "82%", l: "72%", s: 11, d: "1.8s", c: theme.color.paper },
          ].map((dm, i) => (
            <Text key={i} style={[s.diamond as any, { top: dm.t, left: dm.l, fontSize: dm.s, color: dm.c }, { animationDelay: dm.d } as any]}>
              ◆
            </Text>
          ))}
        </View>
      )}

      {/* drifting glyphs */}
      {web && (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 } as any} pointerEvents="none">
          {[
            { ch: "✕", t: "19%", l: "31%", sz: 30, o: 0.08 },
            { ch: "!", t: "62%", l: "26%", sz: 38, o: 0.06 },
            { ch: "◆", t: "11%", l: "76%", sz: 22, o: 0.07 },
          ].map((g, i) => (
            <Text key={i} style={[s.driftGlyph as any, { top: g.t, left: g.l, fontSize: g.sz, opacity: g.o }, { animationDuration: `${5 + i}s`, animationDelay: `${-i * 0.9}s` } as any]}>
              {g.ch}
            </Text>
          ))}
        </View>
      )}

      {/* hazard tape bottom like shame */}
      {web && (
        <View style={s.tapeFloor as any} pointerEvents="none">
          <View style={{ flexDirection: "row", width: "200%" } as any}>
            {[0, 1].map((half) => (
              <View
                key={half}
                style={[
                  { width: "100%", height: 12, backgroundImage: "repeating-linear-gradient(45deg, #FCEE21 0 16px, #111 16px 32px)" } as any,
                  web && ({ animation: "p5-marquee 16s linear infinite" } as any),
                ]}
              />
            ))}
          </View>
        </View>
      )}

      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />

      <EnhancedDossier data={data} />
    </View>
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
    <View style={s.wrap as any}>
      {/* vertical DOSSIER — intentionally a little crooked, like OPTIONS */}
      <View style={s.titleCol as any}>
        {["D", "O", "S", "S", "I", "E", "R"].map((ch, i) => {
          const to = TITLE_OFF[i];
          return (
            <Text
              key={i}
              style={[
                s.vLetter as any,
                i % 3 === 0 && (s.vLetterC as any),
                i % 3 === 2 && (s.vLetterY as any),
                { transform: [{ rotate: to.rot + "deg" }, { translateX: to.x }, { skewX: "-6deg" }] } as any,
                web && ({ animation: `p5-logoLetter 560ms ${70 + i * 55}ms cubic-bezier(0.16,1,0.3,1) both` } as any),
              ]}
            >
              {ch}
            </Text>
          );
        })}
        <View
          style={[s.titleRibbon as any, { transform: [{ rotate: "-3.2deg" }, { skewX: "-6deg" }, { translateX: 2 }] } as any, web && ({ animation: "heroIn 480ms 520ms both" } as any)]}
          pointerEvents="none"
        >
          <Text style={s.titleRibbonTxt as any}>13 FILES</Text>
        </View>
        {/* yellow tick under title — off-center on purpose */}
        {web && <View style={s.titleTick as any} pointerEvents="none" />}

        {/* view mode toggle — FILE vs 3D ID */}
        <View style={s.idToggleWrap as any}>
          <Pressable
            onPress={() => { playClick(); setView3d(false); }}
            style={[s.idToggleBtn as any, !view3d && (s.idToggleBtnOn as any)]}
          >
            <Text style={[s.idToggleTxt as any, !view3d && (s.idToggleTxtOn as any)]}>FILE</Text>
          </Pressable>
          <Pressable
            onPress={() => { playClick(); setView3d(true); }}
            style={[s.idToggleBtn as any, view3d && (s.idToggleBtnOn as any)]}
          >
            <Text style={[s.idToggleTxt as any, view3d && (s.idToggleTxtOn as any)]}>3D ID</Text>
          </Pressable>
        </View>
      </View>

      {/* selector — finalized combined card (S1 rank block + S2 file header/seal + S3 white name-bar) */}
      <View style={s.selectorWrap as any}>
        <ScrollView style={s.selectorScroll as any} contentContainerStyle={s.selectorContent as any} showsVerticalScrollIndicator={false}>
          {data.students.map((st, i) => {
            const on = st.id === sel;
            const r = rankOf(st.id);
            const off = TAB_OFF[i];
            const codename = DOSSIER[st.id]?.codename ?? `SEAT ${String(st.id).padStart(2, "0")}`;

            // FINAL COMBINED — S1 crimson rank block + S2 red file header & diamond seal + S3 white name-bar
            return (
              <Pressable
                key={st.id}
                onPress={() => {
                  if (st.id === sel) playHover();
                  else {
                    playClick();
                    setSel(st.id);
                  }
                }}
                onHoverIn={playHover}
                style={({ hovered, pressed }) => {
                  const active = hovered;
                  const base = [{ skewX: "-2deg" }] as any[];
                  const tf = pressed
                    ? [...base, { translateY: 3 } as any, { scale: 0.9 } as any]
                    : active && !on
                      ? [...base, { translateY: -9 } as any, { scale: 1.07 } as any]
                      : base;
                  return [
                    s.tab as any,
                    s.tabCombo as any,
                    { marginLeft: off } as any,
                    { transform: tf } as any,
                    on && (s.tabComboOn as any),
                    active && !on && (s.tabComboHov as any),
                    pressed && (s.tabComboDown as any),
                    web && ({ transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1), border-color 160ms, box-shadow 180ms, background-color 160ms, filter 180ms" } as any),
                    web && ({ animation: `p5-tabIn 430ms ${70 + i * 28}ms both` } as any),
                  ];
                }}
              >
                {({ hovered, pressed }) => (
                  <>
                    {/* crimson rank tile (counter-skewed so it stays upright) */}
                    <View style={[s.cRankTile as any, on && (s.cRankTileOn as any), hovered && !on && (s.cRankTileHov as any)]}>
                      <Text style={[s.cRankNum as any, (on || hovered) && (s.cRankNumOn as any)]}>{r}</Text>
                    </View>
                    <View style={s.cBody as any}>
                      <Text style={[s.cName as any, on && (s.cNameOn as any)]} numberOfLines={1}>
                        {codename}
                      </Text>
                    </View>
                    <Text style={[s.cArrow as any, (hovered || on) && (s.cArrowOn as any)]}>▶</Text>
                    <View style={[s.cLine as any, on && (s.cLineOn as any)]} pointerEvents="none" />
                    {pressed && <View style={s.cFlash as any} pointerEvents="none" />}
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* paper / 3D ID — swap by view mode */}
      <View style={s.paperCol as any}>
        {view3d ? (
          <IdCard3D key={"id-" + sel} cur={cur} d={d} locked={locked} variant={3} />
        ) : (
          <View
            key={sel}
            style={[s.docAnimWrap as any, web && ({ animation: "dossierPaperIn 620ms cubic-bezier(0.16,1,0.3,1) both" } as any)]}
          >
            <Pressable
              onHoverIn={playHover}
              onPress={() => playClick()}
              style={({ hovered, pressed }) => [
                s.doc as any,
                hovered && (s.docHover as any),
                pressed && (s.docPressed as any),
                web && ({ transition: "transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms, filter 220ms" } as any),
              ]}
            >
              {({ hovered, pressed }) => (
                <>
                  <Text style={s.watermark as any} pointerEvents="none">
                    CONFIDENTIAL
                  </Text>
                  <View style={[s.tape as any, web && hovered && ({ animation: "dossierTapeWiggle 0.6s ease-in-out" } as any)]} pointerEvents="none" />
                  <View style={s.clip as any} pointerEvents="none" />
                  <View style={s.ring as any} pointerEvents="none" />
                  <View style={s.docHalftone as any} pointerEvents="none" />
                  <View style={s.docHalftoneB as any} pointerEvents="none" />
                  <View style={s.docSlash as any} pointerEvents="none" />
                  <View style={s.docSpeed as any} pointerEvents="none" />

                  <View style={s.docHead as any}>
                    <View style={{ flex: 1 } as any}>
                      <Text style={s.docKicker as any}>FILE NO. {String(cur.id).padStart(3, "0")} — {d.position.toUpperCase()}</Text>
                      <Text style={s.docTitle as any}>{locked ? "FILE ████████" : cur.id === 1 ? `${d.codename} — 2♣` : d.codename}</Text>
                      <Text style={s.docSub as any}>{locked ? "████████ — ██" : d.division === "—" ? d.fullName : `${d.fullName} · ${d.division}`}</Text>
                    </View>
                    <View style={[s.stamp as any, locked && (s.stampSealed as any), hovered && (s.stampHover as any)]}>
                      <Text style={[s.stampTxt as any, locked && (s.stampTxtSealed as any)]}>{locked ? "SEALED" : cur.cleared ? "PACIFIED" : "TOP SECRET"}</Text>
                    </View>
                  </View>

                  <View style={s.docBody as any}>
                    <View style={s.left as any}>
                      <View style={[s.photo as any, hovered && !pressed && (s.photoHover as any)]}>
                        {locked ? (
                          <>
                            <View style={s.photoRedact as any} />
                            <Text style={s.photoQ as any}>?</Text>
                            <Text style={s.photoNo as any}>NO PHOTO ON RECORD</Text>
                          </>
                        ) : (
                          <>
                            <Image source={{ uri: portraitFor(cur.id) }} style={s.photoImg as any} resizeMode="cover" />
                            <View style={s.photoTag as any}>
                              <Text style={s.photoTagTxt as any}>ID PHOTO — 2×2 — ON FILE</Text>
                            </View>
                            <View style={s.photoGrid as any} pointerEvents="none" />
                            {/* yellow corner nick */}
                            <View style={s.photoCorner as any} pointerEvents="none" />
                          </>
                        )}
                      </View>

                      <View style={s.miniGrid as any}>
                        {[
                          ["AGE", locked ? "██" : String(d.age)],
                          ["GENDER", locked ? "██" : d.gender],
                          ["BIRTHDAY", locked ? "████" : d.birthday],
                          ["BLOOD", locked ? "█" : d.bloodType],
                        ].map(([k, v]) => (
                          <View key={k} style={s.miniCell as any}>
                            <Text style={s.miniLabel as any}>{k}</Text>
                            {locked ? <View style={s.miniRedact as any} /> : <Text style={s.miniVal as any}>{v}</Text>}
                          </View>
                        ))}
                      </View>

                      {cur.id !== 1 && (
                        <>
                          <View style={s.threatRow as any}>
                            <Text style={s.threatLabel as any}>THREAT</Text>
                            <View style={s.threatPips as any}>
                              {Array.from({ length: 13 }).map((_, p) => (
                                <View key={p} style={[s.pip as any, p < cur.tier && (s.pipOn as any), locked && (s.pipLocked as any)]} />
                              ))}
                            </View>
                          </View>

                          <View style={s.record as any}>
                            {locked ? (
                              <View style={s.recordRedact as any} />
                            ) : (
                              <Text style={s.recordTxt as any}>
                                {cur.wins}W · {cur.losses}L · {cur.attempts} RUNS · BEST {cur.bestScore}
                              </Text>
                            )}
                          </View>
                        </>
                      )}
                    </View>

                    <View style={s.right as any}>
                      <View style={s.fieldGrid as any}>
                        {[
                          ["FULL NAME", locked ? "████████ █." : d.fullName],
                          ["POSITION", d.position],
                          ...(d.division === "—" ? [] : ([["DIVISION", locked ? "████████ — ██████" : d.division]] as any)),
                          ["STATUS", locked ? "SEALED" : d.status],
                        ].map(([label, val]) => (
                          <View key={label} style={s.field as any}>
                            <Text style={s.fieldLabel as any}>{label}</Text>
                            {locked && label !== "POSITION" ? <View style={s.fieldRedact as any} /> : <Text style={s.fieldVal as any}>{val}</Text>}
                          </View>
                        ))}
                      </View>

                      {!locked && d.associates.length === 0 ? null : (
                        <View style={s.associates as any}>
                          <Text style={s.associatesLabel as any}>KNOWN ASSOCIATES</Text>
                          <View style={s.assocRow as any}>
                            {(locked ? ["—", "—", "—"] : d.associates).map((name, idx) => (
                              <View key={idx} style={[s.assocChip as any, locked && (s.assocChipLocked as any)]}>
                                <Text style={[s.assocTxt as any, locked && (s.assocTxtLocked as any)]}>{name}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      <View style={s.quoteBox as any}>
                        <Text style={s.quoteMark as any}>“</Text>
                        {locked ? <View style={s.quoteRedact as any} /> : <Text style={s.quote as any}>{d.quote}</Text>}
                      </View>

                      <View style={s.caseBox as any}>
                        <View style={s.caseHead as any}>
                          <Text style={s.caseLabel as any}>CASE NOTES — HANDLER</Text>
                          <View style={s.caseLine as any} />
                          {/* tiny hard badge */}
                          <View style={s.caseBadge as any}>
                            <Text style={s.caseBadgeTxt as any}>EYES ONLY</Text>
                          </View>
                        </View>
                        {locked ? (
                          <View style={s.caseRedactCol as any}>
                            <View style={s.caseRedact as any} />
                            <View style={[s.caseRedact as any, { width: "82%" } as any]} />
                            <View style={[s.caseRedact as any, { width: "64%" } as any]} />
                          </View>
                        ) : (
                          <Text style={s.caseText as any}>{d.lore}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={s.idStrip as any}>
                    <View style={s.idLeft as any}>
                      <Text style={s.idLabel as any}>FILE</Text>
                      <Text style={s.idVal as any}>
                        {String(cur.id).padStart(2, "0")}–{rankOf(cur.id)}♣
                      </Text>
                    </View>
                    <View style={s.idMid as any}>
                      <Text style={s.idLabel as any}>DIVISION</Text>
                      <Text style={[s.idVal as any, { fontSize: 10 } as any]}>{locked ? "—" : d.division.split(" —")[0]}</Text>
                    </View>
                    <View style={s.idRight as any}>
                      <Text style={s.idLabel as any}>ISSUED</Text>
                      <Text style={s.idVal as any}>2026-08-24</Text>
                    </View>
                    <View style={s.idBarcode as any}>
                      {Array.from({ length: 18 }).map((_, bi) => (
                        <View key={bi} style={[s.idBar as any, { width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.2 : 1 } as any]} />
                      ))}
                    </View>
                  </View>

                  <Text style={s.foot as any}>HANDLE WITH CARE — PROPERTY OF THE STUDENT COUNCIL — DO NOT DUPLICATE</Text>

                  {/* bottom yellow hard stripe */}
                  <View style={[s.docBottomBar as any, hovered && (s.docBottomBarHov as any)]} pointerEvents="none" />
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

/* ===== 3D floating ID card — perspective + preserve-3d, drag to tilt/rotate, click to flip ===== */
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

  return (
    <View style={s.idStage as any}>
        <View style={[s.idEnter as any, web && ({ animation: "idIn 2200ms cubic-bezier(0.16,1,0.3,1) both" } as any)]}>
        <View style={[s.idShadow as any, web && ({ animation: "shadowBob 5.2s ease-in-out infinite" } as any)]} pointerEvents="none" />
        <View style={[s.idBob as any, web && ({ animation: "float3d 5.2s ease-in-out infinite" } as any)]}>
          {web ? (
            <div
              onPointerDown={startDrag as any}
              style={{
                width: 440,
                height: 640,
                position: "relative",
                transformStyle: "preserve-3d",
                transform: `perspective(1400px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none",
                transition: dragging ? "none" : "transform 650ms cubic-bezier(0.22,1,0.36,1)",
              } as any}
            >
              {/* FRONT — portrait ID */}
              <View
                style={[
                  s.idFace as any,
                  s.idFaceFront as any,
                  variant === 2 && ({ backgroundColor: "#0A1931", borderColor: "#D4AF37" } as any),
                  variant === 3 && ({ backgroundColor: "#0A0A0A", borderColor: "#E60012" } as any),
                ]}
              >
                <View style={s.idTopBar as any}>
                  <View style={s.idBrandRow as any}>
                    <View style={s.idCrest as any} />
                    <Text style={s.idSchoolTxt as any}>VERTEX INSTITUTE</Text>
                  </View>
                  <View style={s.idChipY as any}>
                    <Text style={s.idChipYT as any}>STUDENT · 2026</Text>
                  </View>
                </View>

                <View style={s.idMainRow as any}>
                  <View style={s.idPhotoWrap as any}>
                    <View style={s.idPhotoTape as any} />
                    {locked ? (
                      <View style={s.idPhotoEmpty as any}>
                        <Text style={s.idPhotoQ as any}>?</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: portraitFor(cur.id) }} style={s.idPhotoImg as any} resizeMode="cover" />
                    )}
                  </View>

                  <View style={s.idFields as any}>
                    <Text style={[s.idCardLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>STUDENT NAME</Text>
                    <Text style={[s.idName as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "████████ ██." : d.fullName}</Text>
                    <View style={[s.idNameRule as any, (variant === 2 || variant === 3) && ({ backgroundColor: "#f5efe1" } as any)]} />
                    <Text style={[s.idCardLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>SECTION</Text>
                    <Text style={[s.idSection as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "██████" : d.division.split(" —")[0]}</Text>
                  </View>
                </View>

                <View style={s.idBottomBar as any}>
                  <Text style={s.idNo as any}>NO. VI-{String(cur.id).padStart(4, "0")}</Text>
                <View style={s.idCardBarcode as any}>
                  {bars.map((_, bi) => (
                    <View key={bi} style={[s.idCardBar as any, { width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.25 : 1 } as any]} />
                  ))}
                </View>
                  <Text style={s.idMicro as any}>IF FOUND, RETURN</Text>
                </View>

                <View style={s.idSheen as any} pointerEvents="none" />
                <View style={s.idHalftone as any} pointerEvents="none" />
                <Text style={s.idHint as any}>HOLD + DRAG · CLICK TO FLIP</Text>
              </View>

              {/* BACK — portrait detailed */}
              <View
                style={[
                  s.idFace as any,
                  s.idFaceBack as any,
                  variant === 2 && ({ backgroundColor: "#0A1931", borderColor: "#D4AF37" } as any),
                  variant === 3 && ({ backgroundColor: "#0A0A0A", borderColor: "#E60012" } as any),
                ]}
              >
                <View style={s.idMagStripe as any} />
                <View style={{ paddingHorizontal: 20, paddingTop: 12, alignItems: "center" } as any}>
                  <Text style={{ fontFamily: theme.font.display, fontSize: 13, letterSpacing: 3, color: theme.color.crimson } as any}>STUDENT RECORD</Text>
                  <View style={{ height: 2, width: 60, backgroundColor: theme.color.crimson, marginTop: 4, transform: [{ skewX: "-20deg" }] } as any} />
                </View>
                {variant === 3 && (
                  <>
                    <Text
                      style={
                        {
                          position: "absolute",
                          right: 12,
                          top: 62,
                          fontFamily: theme.font.display,
                          fontSize: 140,
                          color: "rgba(230,0,18,0.07)",
                          transform: [{ rotate: "-12deg" }],
                        } as any
                      }
                      pointerEvents="none"
                    >
                      {rankOf(cur.id)}
                    </Text>
                    <View
                      style={
                        {
                          position: "absolute",
                          top: 44,
                          left: -20,
                          right: -20,
                          height: 3,
                          backgroundColor: theme.color.crimson,
                          transform: [{ rotate: "-2deg" }],
                          opacity: 0.9,
                        } as any
                      }
                      pointerEvents="none"
                    />
                  </>
                )}
                <View style={s.idBackGrid as any}>
                  <View style={s.idBackCol as any}>
                    {[
                      ["BIRTHDAY", d.birthday],
                      ["BLOOD TYPE", d.bloodType],
                      ["GENDER", d.gender],
                    ].map(([k, v]) => (
                      <View key={k} style={s.idFRow as any}>
                        <Text style={[s.idFLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>{k}</Text>
                        <Text style={[s.idFVal as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "████" : v}</Text>
                        <View style={[s.idFDot as any, (variant === 2 || variant === 3) && ({ borderTopColor: "rgba(245,239,225,0.3)" } as any)]} />
                      </View>
                    ))}
                  </View>
                  <View style={s.idBackCol as any}>
                    {[
                      ["ISSUED", "2026-08-24"],
                      ["VALID THRU", "2027-08-24"],
                      ["STATUS", locked ? "SEALED" : d.status],
                    ].map(([k, v]) => (
                      <View key={k} style={s.idFRow as any}>
                        <Text style={[s.idFLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>{k}</Text>
                        <Text style={[s.idFVal as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "████" : v}</Text>
                        <View style={[s.idFDot as any, (variant === 2 || variant === 3) && ({ borderTopColor: "rgba(245,239,225,0.3)" } as any)]} />
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[s.idQr as any, { backgroundColor: "#fff", padding: 6 } as any]} pointerEvents="none">
                  {Array.from({ length: 81 }).map((_, q) => {
                    const r = Math.floor(q / 9);
                    const c = q % 9;
                    const isFinder =
                      (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
                    const isFinderInner = isFinder && r % 3 === 1 && c % 3 === 1 && !( (r < 3 && c < 3 && r===1 && c===1) || (r < 3 && c > 5 && r===1 && c===7) || (r > 5 && c < 3 && r===7 && c===1) );
                    // finder border vs inner
                    const on = isFinder ? (r % 2 === 0 || c % 2 === 0 ? true : r===1 && c===1 || r===1 && c===7 || r===7 && c===1) : (q * 7 + c * 13) % 5 % 2 === 0;
                    return <View key={q} style={[s.idQrCell as any, on && (s.idQrOn as any), isFinderInner && ({ backgroundColor: "#fff" } as any)]} />;
                  })}
                </View>
                <View style={s.idBackFoot as any}>
                  <Text style={s.idMicroDark as any}>PROPERTY OF VERTEX · DO NOT DUPLICATE</Text>
                  <View style={s.idBarcodeSm as any}>
                    {Array.from({ length: 18 }).map((_, bi) => (
                      <View key={bi} style={[s.idBarW as any, { width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.3 : 1 } as any]} />
                    ))}
                  </View>
                </View>
                <Text style={[s.idHint as any, { color: "rgba(255,255,255,0.35)" } as any]}>HOLD + DRAG · CLICK TO FLIP</Text>
              </View>
              <View style={[s.idEdge as any, s.idEdgeRight as any]} pointerEvents="none" />
              <View style={[s.idEdge as any, s.idEdgeLeft as any]} pointerEvents="none" />
              <View style={[s.idEdge as any, s.idEdgeTop as any]} pointerEvents="none" />
              <View style={[s.idEdge as any, s.idEdgeBottom as any]} pointerEvents="none" />
            </div>
          ) : (
            <View
              style={[
                s.idCard as any,
                { transform: [{ perspective: 1400 }, { rotateX: rot.x }, { rotateY: rot.y }] } as any,
              ]}
            >
              {/* FRONT — portrait ID */}
              <View
                style={[
                  s.idFace as any,
                  s.idFaceFront as any,
                  variant === 2 && ({ backgroundColor: "#0A1931", borderColor: "#D4AF37" } as any),
                  variant === 3 && ({ backgroundColor: "#0A0A0A", borderColor: "#E60012" } as any),
                ]}
              >
                <View style={s.idTopBar as any}>
                  <View style={s.idBrandRow as any}>
                    <View style={s.idCrest as any} />
                    <Text style={s.idSchoolTxt as any}>VERTEX INSTITUTE</Text>
                  </View>
                  <View style={s.idChipY as any}>
                    <Text style={s.idChipYT as any}>STUDENT · 2026</Text>
                  </View>
                </View>

                <View style={s.idMainRow as any}>
                  <View style={s.idPhotoWrap as any}>
                    <View style={s.idPhotoTape as any} />
                    {locked ? (
                      <View style={s.idPhotoEmpty as any}>
                        <Text style={s.idPhotoQ as any}>?</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: portraitFor(cur.id) }} style={s.idPhotoImg as any} resizeMode="cover" />
                    )}
                  </View>

                  <View style={s.idFields as any}>
                    <Text style={[s.idCardLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>STUDENT NAME</Text>
                    <Text style={[s.idName as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "████████ ██." : d.fullName}</Text>
                    <View style={[s.idNameRule as any, (variant === 2 || variant === 3) && ({ backgroundColor: "#f5efe1" } as any)]} />
                    <Text style={[s.idCardLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>SECTION</Text>
                    <Text style={[s.idSection as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "██████" : d.division.split(" —")[0]}</Text>
                  </View>
                </View>

                <View style={s.idBottomBar as any}>
                  <Text style={s.idNo as any}>NO. VI-{String(cur.id).padStart(4, "0")}</Text>
                <View style={s.idCardBarcode as any}>
                  {bars.map((_, bi) => (
                    <View key={bi} style={[s.idCardBar as any, { width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.25 : 1 } as any]} />
                  ))}
                </View>
                  <Text style={s.idMicro as any}>IF FOUND, RETURN</Text>
                </View>

                <View style={s.idSheen as any} pointerEvents="none" />
                <View style={s.idHalftone as any} pointerEvents="none" />
                <Text style={s.idHint as any}>HOLD + DRAG · CLICK TO FLIP</Text>
              </View>

              {/* BACK — portrait detailed */}
              <View
                style={[
                  s.idFace as any,
                  s.idFaceBack as any,
                  variant === 2 && ({ backgroundColor: "#0A1931", borderColor: "#D4AF37" } as any),
                  variant === 3 && ({ backgroundColor: "#0A0A0A", borderColor: "#E60012" } as any),
                ]}
              >
                <View style={s.idMagStripe as any} />
                <View style={{ paddingHorizontal: 20, paddingTop: 12, alignItems: "center" } as any}>
                  <Text style={{ fontFamily: theme.font.display, fontSize: 13, letterSpacing: 3, color: theme.color.crimson } as any}>STUDENT RECORD</Text>
                  <View style={{ height: 2, width: 60, backgroundColor: theme.color.crimson, marginTop: 4, transform: [{ skewX: "-20deg" }] } as any} />
                </View>
                {variant === 3 && (
                  <>
                    <Text
                      style={
                        {
                          position: "absolute",
                          right: 12,
                          top: 62,
                          fontFamily: theme.font.display,
                          fontSize: 140,
                          color: "rgba(230,0,18,0.07)",
                          transform: [{ rotate: "-12deg" }],
                        } as any
                      }
                      pointerEvents="none"
                    >
                      {rankOf(cur.id)}
                    </Text>
                    <View
                      style={
                        {
                          position: "absolute",
                          top: 44,
                          left: -20,
                          right: -20,
                          height: 3,
                          backgroundColor: theme.color.crimson,
                          transform: [{ rotate: "-2deg" }],
                          opacity: 0.9,
                        } as any
                      }
                      pointerEvents="none"
                    />
                  </>
                )}
                <View style={s.idBackGrid as any}>
                  <View style={s.idBackCol as any}>
                    {[
                      ["BIRTHDAY", d.birthday],
                      ["BLOOD TYPE", d.bloodType],
                      ["GENDER", d.gender],
                    ].map(([k, v]) => (
                      <View key={k} style={s.idFRow as any}>
                        <Text style={[s.idFLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>{k}</Text>
                        <Text style={[s.idFVal as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "████" : v}</Text>
                        <View style={[s.idFDot as any, (variant === 2 || variant === 3) && ({ borderTopColor: "rgba(245,239,225,0.3)" } as any)]} />
                      </View>
                    ))}
                  </View>
                  <View style={s.idBackCol as any}>
                    {[
                      ["ISSUED", "2026-08-24"],
                      ["VALID THRU", "2027-08-24"],
                      ["STATUS", locked ? "SEALED" : d.status],
                    ].map(([k, v]) => (
                      <View key={k} style={s.idFRow as any}>
                        <Text style={[s.idFLabel as any, (variant === 2 || variant === 3) && ({ color: "rgba(245,239,225,0.7)" } as any)]}>{k}</Text>
                        <Text style={[s.idFVal as any, (variant === 2 || variant === 3) && ({ color: "#f5efe1" } as any)]}>{locked ? "████" : v}</Text>
                        <View style={[s.idFDot as any, (variant === 2 || variant === 3) && ({ borderTopColor: "rgba(245,239,225,0.3)" } as any)]} />
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[s.idQr as any, { backgroundColor: "#fff", padding: 6 } as any]} pointerEvents="none">
                  {Array.from({ length: 81 }).map((_, q) => {
                    const r = Math.floor(q / 9);
                    const c = q % 9;
                    const isFinder =
                      (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
                    const isFinderInner = isFinder && r % 3 === 1 && c % 3 === 1 && !( (r < 3 && c < 3 && r===1 && c===1) || (r < 3 && c > 5 && r===1 && c===7) || (r > 5 && c < 3 && r===7 && c===1) );
                    // finder border vs inner
                    const on = isFinder ? (r % 2 === 0 || c % 2 === 0 ? true : r===1 && c===1 || r===1 && c===7 || r===7 && c===1) : (q * 7 + c * 13) % 5 % 2 === 0;
                    return <View key={q} style={[s.idQrCell as any, on && (s.idQrOn as any), isFinderInner && ({ backgroundColor: "#fff" } as any)]} />;
                  })}
                </View>
                <View style={s.idBackFoot as any}>
                  <Text style={s.idMicroDark as any}>PROPERTY OF VERTEX · DO NOT DUPLICATE</Text>
                  <View style={s.idBarcodeSm as any}>
                    {Array.from({ length: 18 }).map((_, bi) => (
                      <View key={bi} style={[s.idBarW as any, { width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.3 : 1 } as any]} />
                    ))}
                  </View>
                </View>
                <Text style={[s.idHint as any, { color: "rgba(255,255,255,0.35)" } as any]}>HOLD + DRAG · CLICK TO FLIP</Text>
              </View>
              <View style={[s.idEdge as any, s.idEdgeRight as any]} pointerEvents="none" />
              <View style={[s.idEdge as any, s.idEdgeLeft as any]} pointerEvents="none" />
              <View style={[s.idEdge as any, s.idEdgeTop as any]} pointerEvents="none" />
              <View style={[s.idEdge as any, s.idEdgeBottom as any]} pointerEvents="none" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function IdCardSamples({ cur, d, locked }: { cur: StudentRow; d: any; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <View style={s.samplesWrap as any}>
      {[1, 2, 3].map((vid) => (
        <View key={vid} style={s.sampleCard as any}>
          <Text style={s.sampleLabel as any}>{vid === 1 ? "SAMPLE 1 — CALLING CARD" : vid === 2 ? "SAMPLE 2 — VELVET ROOM" : "SAMPLE 3 — PHANTOM THIEF"}</Text>
          <Text style={s.sampleSub as any}>{vid === 1 ? "Pop-punk red / white" : vid === 2 ? "Navy / gold" : "Black / red slash"}</Text>
          <View style={{ transform: [{ scale: 0.62 }] } as any}>
            <IdCard3D cur={cur} d={d} locked={locked} variant={vid} />
          </View>
          <Pressable onPress={() => { playClick(); setPicked(vid); }} style={[s.samplePick as any, picked === vid && (s.samplePickOn as any)]}>
            <Text style={[s.samplePickTxt as any, picked === vid && (s.samplePickTxtOn as any)]}>{picked === vid ? "PICKED" : "PICK THIS"}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

  const s = StyleSheet.create({

    stage: {
      flex: 1,
      backgroundColor: theme.color.black,
      overflow: "hidden",
      ...(web ? {
        backgroundImage: HATCH,
        backgroundSize: "44px 44px",
        animation: "bgShift 1.8s linear infinite"
      } : {})
    },
    loadingTxt: {
      fontFamily: theme.font.display,
      fontSize: 32,
      color: theme.color.paper,
      letterSpacing: 2,
      transform: [{
        skewX: "-8deg"
      }],
      textAlign: "center",
      marginTop: "40%"
    },
    /* ===== stage accents ===== */
    envSlashL: {
      position: "absolute",
      top: "-10%",
      left: "-6%",
      width: "32%",
      height: "120%",
      transform: [{
        skewX: "-18deg"
      }],
      overflow: "hidden",
      zIndex: 0
    },
    envSlashLIn: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.color.crimson,
      opacity: 0.095
    },
    envSlashR: {
      position: "absolute",
      top: "-10%",
      right: "-7%",
      width: "26%",
      height: "120%",
      transform: [{
        skewX: "16deg"
      }],
      overflow: "hidden",
      zIndex: 0
    },
    envSlashRIn: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.color.crimsonDeep,
      opacity: 0.085
    },
    burst: {
      position: "absolute",
      right: "-10%",
      top: "46%",
      width: 520,
      height: 520,
      marginTop: -260,
      opacity: 0.11,
      backgroundColor: theme.color.crimson,
      borderRadius: 20,
      transform: [{
        rotate: "45deg"
      }],
      ...(web ? {
        backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.55) 0deg 5deg, transparent 5deg 11deg)",
        animation: "p5-burstSpin 28s linear infinite"
      } : {}),
      zIndex: 0
    },
    ghost: {
      position: "absolute",
      right: "1.5%",
      top: "4%",
      fontFamily: theme.font.display,
      fontSize: 420,
      lineHeight: 400,
      color: "transparent",
      ...(web ? {
        WebkitTextStroke: "3px rgba(252,238,33,0.09)"
      } : {}),
      zIndex: 0,
      opacity: 0.9,
      transform: [{
        skewX: "-8deg"
      }]
    },
    halftoneA: {
      position: "absolute",
      top: "9%",
      left: "18%",
      width: 220,
      height: 140,
      opacity: 0.11,
      transform: [{
        rotate: "-8deg"
      }, {
        skewX: "-6deg"
      }],
      zIndex: 1,
      ...(web ? {
        backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)",
        backgroundSize: "14px 14px"
      } : {})
    },
    halftoneB: {
      position: "absolute",
      bottom: "16%",
      left: "34%",
      width: 180,
      height: 120,
      opacity: 0.08,
      transform: [{
        rotate: "12deg"
      }],
      zIndex: 1,
      ...(web ? {
        backgroundImage: "radial-gradient(circle, #E60012 1.4px, transparent 1.7px)",
        backgroundSize: "12px 12px"
      } : {})
    },
    halftoneC: {
      position: "absolute",
      top: "12%",
      right: "8%",
      width: 140,
      height: 100,
      opacity: 0.09,
      transform: [{
        rotate: "-14deg"
      }],
      zIndex: 1,
      ...(web ? {
        backgroundImage: "radial-gradient(circle, #FFFFFF 1.3px, transparent 1.6px)",
        backgroundSize: "12px 12px"
      } : {})
    },
    linesWrap: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1
    },
    diamond: {
      position: "absolute",
      textShadow: "2px 2px 0 rgba(0,0,0,0.55)",
      ...(web ? {
        animation: "p5-float 3.6s ease-in-out infinite"
      } : {})
    },
    driftGlyph: {
      position: "absolute",
      fontFamily: theme.font.display,
      color: theme.color.crimson,
      textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
      ...(web ? {
        animation: "p5-float 5s ease-in-out infinite"
      } : {})
    },
    tapeFloor: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      overflow: "hidden",
      zIndex: 5,
      opacity: 0.92
    },
    /* ===== layout — matches OPTIONS: gap 36, title 118, letters 84/88 with crimson maxWidth trick ===== */
    wrap: {
      flex: 1,
      flexDirection: "row",
      gap: 36,
      paddingHorizontal: "5%",
      paddingTop: 84,
      paddingBottom: 28,
      zIndex: 3,
      alignItems: "flex-start"
    },
    titleCol: {
      width: 118,
      paddingTop: 2
    },
    vLetter: {
      fontFamily: theme.font.display,
      fontSize: 84,
      lineHeight: 88,
      color: theme.color.paper,
      textShadow: `4px 4px 0 ${theme.color.crimson}`,
      letterSpacing: 1
    },
    vLetterC: {
      color: theme.color.crimson,
      textShadow: `4px 4px 0 ${theme.color.paper}`,
      maxWidth: 100,
      textAlign: "center"
    },
    vLetterY: {
      color: theme.color.yellow,
      textShadow: `4px 4px 0 ${theme.color.black}`
    },
    titleRibbon: {
      marginTop: 14,
      backgroundColor: theme.color.yellow,
      borderWidth: 3,
      borderColor: theme.color.black,
      paddingVertical: 6,
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOpacity: 0.5,
      shadowRadius: 0,
      shadowOffset: {
        width: 5,
        height: 5
      }
    },
    titleRibbonTxt: {
      fontFamily: theme.font.body,
      fontSize: 11,
      letterSpacing: 3,
      fontWeight: "900",
      color: theme.color.black
    },
    titleTick: {
      marginTop: 14,
      width: 44,
      height: 3,
      backgroundColor: theme.color.crimson,
      transform: [{
        rotate: "-2deg"
      }, {
        skewX: "-12deg"
      }],
      opacity: 0.9,
      marginLeft: 6
    },
    paperCol: {
      flex: 1,
      maxWidth: 1060,
      justifyContent: "center",
      ...(web ? {
        transform: "rotate(0.35deg) translateY(-1px)"
      } : {})
    },
    docAnimWrap: {
      flex: 1
    },
    selectorWrap: {
      width: 328,
      alignSelf: "stretch",
      gap: 9,
      paddingTop: 2,
      ...(web ? {
        transform: "rotate(0.55deg)"
      } : {})
    },
    selectorScroll: {
      flex: 1
    },
    selectorContent: {
      gap: 9,
      paddingRight: 6,
      paddingBottom: 10,
      paddingTop: 2
    },
    /* tabs — persona file tabs, stacked & staggered, hard shadows, shimmer */
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#0f0f0f",
      borderWidth: 3,
      borderColor: "#000",
      borderLeftWidth: 0,
      paddingVertical: 12,
      paddingHorizontal: 14,
      paddingLeft: 24,
      paddingTop: 16,
      shadowColor: "#000",
      shadowOpacity: 0.55,
      shadowRadius: 0,
      shadowOffset: {
        width: 8,
        height: 8
      },
      overflow: "hidden",
      ...(web ? {
        boxShadow: "8px 8px 0 #000",
        transition: "transform 180ms cubic-bezier(0.16,1,0.3,1), background-color 160ms, box-shadow 160ms, filter 160ms"
      } : {})
    },
    tabC: {
      backgroundColor: "#f6f1e3",
      borderWidth: 3,
      borderColor: "#000",
      paddingTop: 22
    },
    // ——— CARD (elegant rowCard — matches Options/Shame/Campaign + paper hard-shadow motion) ———
    tabCombo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: "#141414",
      borderWidth: 1,
      borderColor: "#2b2b2b",
      paddingVertical: 20,
      paddingLeft: 78,
      paddingRight: 18,
      ...(web ? {
        boxShadow: "8px 9px 0 #000",
        transition: "transform 180ms cubic-bezier(0.16,1,0.3,1), border-color 160ms, box-shadow 180ms, background-color 160ms, filter 180ms"
      } : {
        shadowColor: "#000",
        shadowOpacity: 0.6,
        shadowOffset: {
          width: 8,
          height: 9
        },
        shadowRadius: 0
      })
    },
    tabComboOn: {
      backgroundColor: "#1b1b1b",
      borderColor: theme.color.yellow,
      ...(web ? {
        boxShadow: `0 0 0 2px ${theme.color.yellow}, 10px 12px 0 #000`,
        filter: "brightness(1.02) saturate(1.04)"
      } : {
        borderColor: theme.color.yellow,
        shadowColor: "#000",
        shadowOpacity: 0.7,
        shadowOffset: {
          width: 10,
          height: 12
        },
        shadowRadius: 0
      })
    },
    tabComboHov: {
      backgroundColor: "#1a1a1a",
      borderColor: theme.color.paper,
      ...(web ? {
        boxShadow: "16px 18px 0 #000",
        filter: "brightness(1.04) saturate(1.06)"
      } : {
        shadowColor: "#000",
        shadowOpacity: 0.85,
        shadowOffset: {
          width: 16,
          height: 18
        },
        shadowRadius: 0
      })
    },
    tabComboDown: {
      ...(web ? {
        boxShadow: "6px 7px 0 #000",
        filter: "brightness(0.97)"
      } : {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowOffset: {
          width: 6,
          height: 7
        },
        shadowRadius: 0
      })
    },
    cRankTile: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 58,
      backgroundColor: theme.color.crimson,
      alignItems: "center",
      justifyContent: "center",
      borderRightWidth: 3,
      borderRightColor: "#000"
    },
    cRankTileOn: {
      backgroundColor: theme.color.yellow,
      borderRightColor: theme.color.crimson
    },
    cRankTileHov: {
      backgroundColor: theme.color.yellow
    },
    cRankNum: {
      fontFamily: theme.font.display,
      fontSize: 30,
      color: theme.color.paper,
      fontWeight: "900",
      lineHeight: 30
    },
    cRankNumOn: {
      color: "#000"
    },
    cBody: {
      flex: 1,
      justifyContent: "center"
    },
    cName: {
      fontFamily: theme.font.display,
      fontSize: 26,
      color: theme.color.paper,
      letterSpacing: 1.2,
      fontWeight: "900"
    },
    cNameOn: {
      color: theme.color.yellow
    },
    cArrow: {
      fontSize: 16,
      color: "rgba(255,255,255,0.15)",
      fontWeight: "900",
      ...(web ? {
        transition: "transform 180ms, color 180ms"
      } : {})
    },
    cArrowOn: {
      color: theme.color.crimson,
      transform: [{
        translateX: -5
      }]
    },
    cLine: {
      position: "absolute",
      left: 0,
      bottom: 0,
      height: 4,
      width: 0,
      backgroundColor: theme.color.yellow,
      ...(web ? {
        transition: "width 260ms cubic-bezier(0.16,1,0.3,1)"
      } : {})
    },
    cLineOn: {
      width: "100%"
    },
    cFlash: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(230,0,18,0.30)"
    },
    /* ===== doc (paper) — bigger, heavier shadows, more halftone ===== */
    doc: {
      flex: 1,
      backgroundColor: "#f6f1e3",
      transform: [{
        rotate: "-0.6deg"
      }, {
        skewX: "-0.6deg"
      }],
      paddingTop: 36,
      paddingBottom: 24,
      paddingHorizontal: 42,
      shadowColor: "#000",
      shadowOpacity: 0.62,
      shadowRadius: 0,
      shadowOffset: {
        width: 14,
        height: 16
      },
      borderWidth: 3,
      borderColor: theme.color.crimson,
      overflow: "hidden",
      ...(web ? {
        boxShadow: `14px 16px 0 ${theme.color.crimson}`
      } : {
        shadowColor: theme.color.crimson,
        shadowOpacity: 1,
        shadowOffset: {
          width: 14,
          height: 16
        },
        shadowRadius: 0
      })
    },
    docHover: {
      transform: [{
        rotate: "-0.4deg"
      }, {
        skewX: "-0.6deg"
      }, {
        translateY: -8
      }, {
        scale: 1.012
      }],
      shadowOpacity: 0.72,
      shadowOffset: {
        width: 18,
        height: 22
      },
      ...(web ? {
        boxShadow: "19px 23px 0 #E60012",
        filter: "brightness(1.02) saturate(1.04)"
      } : {})
    },
    docPressed: {
      transform: [{
        rotate: "-0.6deg"
      }, {
        skewX: "-0.6deg"
      }, {
        translateY: -2
      }, {
        scale: 0.992
      }],
      shadowOpacity: 0.5,
      shadowOffset: {
        width: 8,
        height: 10
      },
      ...(web ? {
        boxShadow: "8px 10px 0 #E60012",
        filter: "brightness(0.98)"
      } : {})
    },
    watermark: {
      position: "absolute",
      top: "38%",
      left: "-6%",
      right: "-6%",
      textAlign: "center",
      fontFamily: theme.font.display,
      fontSize: 104,
      letterSpacing: 14,
      color: theme.color.crimson,
      opacity: 0.06,
      transform: [{
        rotate: "-14deg"
      }, {
        skewX: "-8deg"
      }]
    },
    tape: {
      position: "absolute",
      top: -10,
      left: "42%",
      width: 116,
      height: 30,
      backgroundColor: "rgba(252,238,33,0.88)",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: "rgba(0,0,0,0.12)",
      transform: [{
        rotate: "-2deg"
      }],
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 0,
      shadowOffset: {
        width: 2,
        height: 3
      },
      zIndex: 5
    },
    clip: {
      position: "absolute",
      top: -12,
      right: 52,
      width: 30,
      height: 60,
      borderWidth: 4,
      borderTopColor: "transparent",
      borderLeftColor: "#9a9a9a",
      borderRightColor: "#9a9a9a",
      borderBottomColor: "#9a9a9a",
      borderRadius: 8,
      transform: [{
        rotate: "7deg"
      }],
      zIndex: 6
    },
    ring: {
      position: "absolute",
      bottom: 46,
      right: 22,
      width: 86,
      height: 86,
      borderRadius: 43,
      borderWidth: 4,
      borderColor: "rgba(139,90,43,0.15)"
    },
    docHalftone: {
      position: "absolute",
      top: -10,
      right: -14,
      width: 156,
      height: 132,
      opacity: 0.095,
      transform: [{
        rotate: "12deg"
      }],
      ...(web ? {
        backgroundImage: "radial-gradient(circle, #E60012 1.5px, transparent 1.7px)",
        backgroundSize: "12px 12px"
      } : {})
    },
    docHalftoneB: {
      position: "absolute",
      bottom: 78,
      left: -12,
      width: 170,
      height: 110,
      opacity: 0.07,
      transform: [{
        rotate: "-10deg"
      }, {
        skewX: "-6deg"
      }],
      ...(web ? {
        backgroundImage: "radial-gradient(circle, #FCEE21 1.4px, transparent 1.6px)",
        backgroundSize: "13px 13px"
      } : {})
    },
    docSlash: {
      position: "absolute",
      top: "20%",
      left: "-10%",
      right: "-10%",
      height: 3,
      backgroundColor: theme.color.crimson,
      opacity: 0.13,
      transform: [{
        rotate: "-2deg"
      }]
    },
    docSpeed: {
      position: "absolute",
      top: 64,
      left: "-6%",
      right: "-6%",
      height: 4,
      opacity: 0.09,
      transform: [{
        skewX: "-12deg"
      }],
      ...(web ? {
        backgroundImage: "repeating-linear-gradient(90deg, rgba(230,0,18,0.9) 0 18px, transparent 18px 34px)"
      } : {})
    },
    docHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderBottomWidth: 3.5,
      borderBottomColor: theme.color.black,
      paddingBottom: 12,
      gap: 16
    },
    docKicker: {
      fontFamily: theme.font.body,
      fontSize: 12,
      letterSpacing: 3.5,
      color: "#666",
      fontWeight: "800"
    },
    docTitle: {
      fontFamily: theme.font.display,
      fontSize: 50,
      color: theme.color.black,
      marginTop: 6,
      letterSpacing: 0.8,
      lineHeight: 52
    },
    docSub: {
      fontFamily: theme.font.body,
      fontSize: 15,
      letterSpacing: 1.8,
      color: "#444",
      fontWeight: "700",
      marginTop: 5
    },
    stamp: {
      borderWidth: 3,
      borderColor: theme.color.crimson,
      paddingHorizontal: 14,
      paddingVertical: 7,
      transform: [{
        rotate: "6deg"
      }],
      marginTop: 4,
      backgroundColor: "rgba(255,255,255,0.55)"
    },
    stampSealed: {
      borderColor: "#8a8a8a",
      backgroundColor: "rgba(240,240,240,0.6)"
    },
    stampHover: {
      transform: [{
        rotate: "4deg"
      }, {
        scale: 1.04
      }]
    },
    stampTxt: {
      fontFamily: theme.font.body,
      fontSize: 12,
      letterSpacing: 3,
      color: theme.color.crimson,
      fontWeight: "900"
    },
    stampTxtSealed: {
      color: "#8a8a8a"
    },
    docBody: {
      flexDirection: "row",
      gap: 24,
      marginTop: 18
    },
    left: {
      width: 340,
      gap: 14
    },
    photo: {
      width: 340,
      height: 340,
      backgroundColor: "#0e0e0e",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3.5,
      borderColor: "#d8d0ba",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 0,
      shadowOffset: {
        width: 6,
        height: 6
      }
    },
    photoHover: {
      borderColor: theme.color.crimson,
      shadowOpacity: 0.32,
      shadowOffset: {
        width: 8,
        height: 8
      }
    },
    photoImg: {
      width: "100%",
      height: "100%"
    },
    photoRedact: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#111"
    },
    photoQ: {
      fontFamily: theme.font.display,
      fontSize: 72,
      color: "#2a2a2a"
    },
    photoNo: {
      position: "absolute",
      bottom: 8,
      fontFamily: theme.font.body,
      fontSize: 8,
      letterSpacing: 2,
      color: "#555",
      fontWeight: "800"
    },
    photoTag: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.86)",
      paddingVertical: 5,
      alignItems: "center"
    },
    photoTagTxt: {
      fontFamily: theme.font.body,
      fontSize: 8,
      letterSpacing: 2,
      color: theme.color.yellow,
      fontWeight: "800"
    },
    photoGrid: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.07,
      ...(web ? {
        backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.6) 1px, transparent 1px)",
        backgroundSize: "22px 22px"
      } : {})
    },
    photoCorner: {
      position: "absolute",
      top: -1,
      right: -1,
      width: 28,
      height: 28,
      backgroundColor: theme.color.yellow,
      borderLeftWidth: 2,
      borderBottomWidth: 2,
      borderColor: theme.color.black,
      ...(web ? {
        clipPath: "polygon(100% 0%, 0% 0%, 100% 100%)"
      } : {})
    },
    miniGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9
    },
    miniCell: {
      width: "48.2%",
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d8d0ba",
      paddingVertical: 11,
      paddingHorizontal: 12,
      gap: 4,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 0,
      shadowOffset: {
        width: 2,
        height: 2
      }
    },
    miniLabel: {
      fontFamily: theme.font.body,
      fontSize: 10,
      letterSpacing: 2.2,
      color: theme.color.crimson,
      fontWeight: "900"
    },
    miniVal: {
      fontFamily: theme.font.body,
      fontSize: 17,
      color: "#111",
      fontWeight: "800"
    },
    miniRedact: {
      height: 13,
      backgroundColor: "#111",
      borderRadius: 2,
      marginTop: 2
    },
    threatRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2
    },
    threatLabel: {
      fontFamily: theme.font.body,
      fontSize: 9,
      letterSpacing: 2,
      color: theme.color.crimson,
      fontWeight: "900"
    },
    threatPips: {
      flexDirection: "row",
      gap: 3,
      flex: 1
    },
    pip: {
      flex: 1,
      height: 9,
      backgroundColor: "#e8e0c8",
      borderWidth: 1,
      borderColor: "#c9b896"
    },
    pipOn: {
      backgroundColor: theme.color.crimson,
      borderColor: theme.color.crimson
    },
    pipLocked: {
      backgroundColor: "#1e1e1e",
      borderColor: "#2a2a2a"
    },
    record: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d8d0ba",
      paddingVertical: 9,
      paddingHorizontal: 10,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowOffset: {
        width: 2,
        height: 2
      }
    },
    recordTxt: {
      fontFamily: theme.font.body,
      fontSize: 13,
      letterSpacing: 1.5,
      color: "#222",
      fontWeight: "800"
    },
    recordRedact: {
      height: 13,
      width: "70%",
      backgroundColor: "#111",
      borderRadius: 2
    },
    right: {
      flex: 1,
      gap: 14
    },
    fieldGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    field: {
      width: "48%",
      minHeight: 68,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d8d0ba",
      paddingVertical: 13,
      paddingHorizontal: 14,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowOffset: {
        width: 2,
        height: 2
      }
    },
    fieldLabel: {
      fontFamily: theme.font.body,
      fontSize: 10,
      letterSpacing: 2,
      color: theme.color.crimson,
      fontWeight: "900"
    },
    fieldVal: {
      fontFamily: theme.font.body,
      fontSize: 17,
      color: "#111",
      fontWeight: "800",
      marginTop: 5,
      letterSpacing: 0.4
    },
    fieldRedact: {
      height: 15,
      marginTop: 5,
      backgroundColor: "#111",
      borderRadius: 2
    },
    associates: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d8d0ba",
      paddingVertical: 11,
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowOffset: {
        width: 2,
        height: 2
      }
    },
    associatesLabel: {
      fontFamily: theme.font.body,
      fontSize: 9,
      letterSpacing: 2,
      color: theme.color.crimson,
      fontWeight: "900"
    },
    assocRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 9,
      flexWrap: "wrap"
    },
    assocChip: {
      backgroundColor: theme.color.black,
      paddingHorizontal: 11,
      paddingVertical: 6,
      transform: [{
        skewX: "-6deg"
      }],
      borderWidth: 1,
      borderColor: theme.color.crimson
    },
    assocChipLocked: {
      backgroundColor: "#222",
      borderColor: "#444"
    },
    assocTxt: {
      fontFamily: theme.font.body,
      fontSize: 11,
      letterSpacing: 1.5,
      color: theme.color.paper,
      fontWeight: "800"
    },
    assocTxtLocked: {
      color: "#777"
    },
    quoteBox: {
      backgroundColor: "#fff",
      borderLeftWidth: 5,
      borderLeftColor: theme.color.crimson,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      gap: 10,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowOffset: {
        width: 2,
        height: 2
      }
    },
    quoteMark: {
      fontFamily: theme.font.display,
      fontSize: 30,
      lineHeight: 30,
      color: theme.color.crimson
    },
    quote: {
      flex: 1,
      fontFamily: theme.font.body,
      fontSize: 16,
      lineHeight: 22,
      color: "#222",
      fontStyle: "italic",
      fontWeight: "500"
    },
    quoteRedact: {
      flex: 1,
      height: 17,
      backgroundColor: "#111",
      borderRadius: 2
    },
    caseBox: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d8d0ba",
      paddingVertical: 16,
      paddingHorizontal: 18,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowOffset: {
        width: 2,
        height: 2
      }
    },
    caseHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10
    },
    caseLabel: {
      fontFamily: theme.font.body,
      fontSize: 10,
      letterSpacing: 2,
      color: theme.color.crimson,
      fontWeight: "900"
    },
    caseLine: {
      flex: 1,
      height: 1.5,
      backgroundColor: "#d8d0ba"
    },
    caseBadge: {
      backgroundColor: theme.color.black,
      paddingHorizontal: 7,
      paddingVertical: 3,
      transform: [{
        skewX: "-6deg"
      }, {
        rotate: "-1deg"
      }]
    },
    caseBadgeTxt: {
      fontFamily: theme.font.body,
      fontSize: 8,
      letterSpacing: 1.5,
      color: theme.color.yellow,
      fontWeight: "800"
    },
    caseText: {
      fontFamily: theme.font.body,
      fontSize: 16,
      lineHeight: 23,
      color: "#222",
      letterSpacing: 0.2
    },
    caseRedactCol: {
      gap: 7
    },
    caseRedact: {
      height: 14,
      backgroundColor: "#111",
      borderRadius: 2
    },
    idStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginTop: 16,
      borderTopWidth: 2.5,
      borderStyle: "dashed",
      borderColor: "#c9b896",
      paddingTop: 12
    },
    idLeft: {
      alignItems: "center"
    },
    idMid: {
      flex: 1
    },
    idRight: {
      alignItems: "center"
    },
    idLabel: {
      fontFamily: theme.font.body,
      fontSize: 8,
      letterSpacing: 2,
      color: "#8a7f6a",
      fontWeight: "800"
    },
    idVal: {
      fontFamily: theme.font.body,
      fontSize: 12,
      letterSpacing: 1.5,
      color: "#111",
      fontWeight: "800",
      marginTop: 2
    },
    idBarcode: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 2,
      height: 24
    },
    idBar: {
      backgroundColor: "#111",
      height: 24
    },
    foot: {
      marginTop: 12,
      fontFamily: theme.font.body,
      fontSize: 9,
      letterSpacing: 3,
      color: "#9a8f7a",
      fontWeight: "800",
      textAlign: "center"
    },
    docBottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 5,
      backgroundColor: theme.color.crimson,
      opacity: 0.92
    },
    docBottomBarHov: {
      height: 7,
      backgroundColor: theme.color.yellow
    },
    // view-mode toggle (left title column)
    idToggleWrap: {
      marginTop: 22,
      flexDirection: "column",
      gap: 7,
      transform: [{
        rotate: "-1.4deg"
      }]
    },
    idToggleBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 2,
      borderColor: "#2b2b2b",
      backgroundColor: "#141414",
      alignItems: "center"
    },
    idToggleBtnOn: {
      borderColor: theme.color.crimson,
      backgroundColor: theme.color.crimson
    },
    idToggleTxt: {
      fontFamily: theme.font.body,
      fontSize: 10,
      letterSpacing: 2,
      color: "#9a8f7a",
      fontWeight: "800"
    },
    idToggleTxtOn: {
      color: theme.color.paper
    },
    // 3D floating card container — v2 (design comes later, this is the rotating shell)
    idStage: { flex: 1, alignItems: "center", justifyContent: "center" } as any,
    idEnter: { alignItems: "center", justifyContent: "center" } as any,
    idBob: { alignItems: "center", justifyContent: "center" } as any,
    idShadow: { position: "absolute", bottom: -38, width: 280, height: 34, borderRadius: 17, ...(web ? ({ backgroundImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)" } as any) : {}) } as any,
    idCard: { width: 440, height: 640, position: "relative" } as any,
    idFace: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, overflow: "hidden", borderWidth: 2.5, borderColor: "#000", backfaceVisibility: "hidden", ...(web ? ({ boxShadow: "0 36px 70px rgba(0,0,0,0.6)" } as any) : {}) } as any,
    idFaceFront: { backgroundColor: "#f5efe1", transform: [{ translateZ: 6 }] } as any,
    idFaceBack: { backgroundColor: "#f5efe1", transform: [{ rotateY: "180deg" }, { translateZ: 6 }] } as any,
    idEdge: { position: "absolute", backgroundColor: "#1e1e22", borderWidth: 1, borderColor: "#000" } as any,
    idEdgeRight: { width: 12, height: 640, left: "50%", top: 0, marginLeft: -6, transform: [{ rotateY: "90deg" }, { translateZ: 220 }] } as any,
    idEdgeLeft: { width: 12, height: 640, left: "50%", top: 0, marginLeft: -6, transform: [{ rotateY: "-90deg" }, { translateZ: 220 }] } as any,
    idEdgeTop: { width: 440, height: 12, top: "50%", left: 0, marginTop: -6, transform: [{ rotateX: "90deg" }, { translateZ: 320 }] } as any,
    idEdgeBottom: { width: 440, height: 12, top: "50%", left: 0, marginTop: -6, transform: [{ rotateX: "-90deg" }, { translateZ: 320 }] } as any,
    idTopBar: { height: 72, backgroundColor: "#0c0c0e", flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 10, borderBottomWidth: 3, borderBottomColor: theme.color.crimson } as any,
    idCrest: { width: 20, height: 20, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
    idSchoolTxt: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 3, color: "#fff" } as any,
    idFrontMid: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 } as any,
    idFrontRank: { fontFamily: theme.font.display, fontSize: 88, lineHeight: 76, color: theme.color.crimson } as any,
    idFrontSub: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 2, color: "#3a3a40", fontWeight: "800" } as any,
    idMagStripe: { height: 52, backgroundColor: "#000", marginTop: 20, opacity: 0.92 } as any,
    idBackMid: { flex: 1, paddingHorizontal: 28, paddingTop: 22, gap: 12 } as any,
    idBackTitle: { fontFamily: theme.font.display, fontSize: 16, letterSpacing: 2, color: theme.color.yellow, textAlign: "center" } as any,
    idBackRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.14)", paddingBottom: 7 } as any,
    idBackKey: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: "rgba(252,238,33,0.72)", fontWeight: "900" } as any,
    idBackVal: { fontFamily: theme.font.body, fontSize: 15, color: "#f1ecdf", fontWeight: "800" } as any,
    idHint: { position: "absolute", bottom: 10, left: 0, right: 0, fontSize: 8, letterSpacing: 2, color: "rgba(0,0,0,0.35)", textAlign: "center", fontWeight: "800" } as any,
    idMainRow: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 16 } as any,
    idRankBand: { width: 84, borderRadius: 6, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center", gap: 1, ...(web ? ({ boxShadow: "4px 5px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
    idRankNum: { fontFamily: theme.font.display, fontSize: 58, lineHeight: 34, color: "#fff" } as any,
    idRankSuit: { fontFamily: theme.font.display, fontSize: 20, lineHeight: 16, color: theme.color.yellow } as any,
    idPhotoWrap: { width: 260, height: 330, backgroundColor: "#fff", borderWidth: 2.5, borderColor: "#000", padding: 5, transform: [{ rotate: "-2deg" }], ...(web ? ({ boxShadow: "5px 6px 0 rgba(0,0,0,0.3)" } as any) : {}) } as any,
    idPhotoImg: { width: "100%", height: "100%" } as any,
    idPhotoEmpty: { flex: 1, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" } as any,
    idPhotoQ: { fontFamily: theme.font.display, fontSize: 64, color: theme.color.crimson } as any,
    idPhotoTape: { position: "absolute", top: -8, left: "50%", width: 52, height: 15, marginLeft: -26, backgroundColor: "rgba(252,238,33,0.85)", transform: [{ rotate: "-3deg" }], zIndex: 3, borderWidth: 1, borderColor: "rgba(0,0,0,0.15)" } as any,
    idFields: { alignItems: "center", gap: 6 } as any,
    idCardLabel: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 2, color: "#8a7f6a", fontWeight: "900" } as any,
    idName: { fontFamily: theme.font.display, fontSize: 38, lineHeight: 42, letterSpacing: 0.5, color: "#15151a", marginTop: 4 } as any,
    idNameRule: { height: 2, width: 72, backgroundColor: "#15151a", marginVertical: 4, transform: [{ skewX: "-20deg" }] } as any,
    idSection: { fontFamily: theme.font.body, fontSize: 19, color: "#3a3a40", fontWeight: "800" } as any,
    idAliasRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 } as any,
    idAlias: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#15151a", paddingVertical: 2, paddingHorizontal: 8, transform: [{ skewX: "-8deg" }] } as any,
    idAliasTxt: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1.5, fontWeight: "900", color: theme.color.crimson } as any,
    idSeat: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1.5, color: "#8a7f6a", fontWeight: "900" } as any,
    idBottomBar: { height: 60, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderTopWidth: 1.5, borderTopColor: "rgba(0,0,0,0.18)", backgroundColor: "rgba(255,255,255,0.4)" } as any,
    idNo: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1.5, color: "#15151a", fontWeight: "900" } as any,
    idMicro: { marginLeft: "auto", fontFamily: theme.font.body, fontSize: 7, letterSpacing: 0.8, color: "#9a8f7a", fontWeight: "800", maxWidth: 100, textAlign: "right" } as any,
    idSheen: { position: "absolute", top: -120, left: 30, width: 100, height: 1100, opacity: 0.5, transform: [{ rotate: "16deg" }], ...(web ? ({ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)" } as any) : {}) } as any,
    idHalftone: { position: "absolute", right: -20, bottom: -24, width: 150, height: 90, opacity: 0.07, transform: [{ rotate: "10deg" }], ...(web ? ({ backgroundImage: "radial-gradient(circle, #E60012 1.4px, transparent 1.6px)", backgroundSize: "9px 9px" } as any) : {}) } as any,
    idQr: { width: 108, height: 108, flexDirection: "row", flexWrap: "wrap", padding: 2, borderWidth: 2, borderColor: "#f1ecdf", alignSelf: "center", marginTop: 8 } as any,
    idQrCell: { width: 8, height: 8, marginRight: 1, marginBottom: 1 } as any,
    idQrOn: { backgroundColor: "#000" } as any,
    idStamp: { position: "absolute", left: 20, top: 84, borderWidth: 2.5, borderColor: "rgba(230,0,18,0.8)", backgroundColor: "rgba(230,0,18,0.06)", paddingVertical: 3, paddingHorizontal: 10, transform: [{ rotate: "-11deg" }] } as any,
    idStampTxt: { fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2, color: "rgba(230,0,18,0.9)" } as any,
    idBackFoot: { height: 40, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, gap: 12 } as any,
    idMicroDark: { fontFamily: theme.font.body, fontSize: 7.5, letterSpacing: 1, color: "rgba(255,255,255,0.45)", fontWeight: "800" } as any,
    idCardBarcode: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 20 } as any,
    idCardBar: { backgroundColor: "#111", height: 20 } as any,
    idBarcodeSm: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 20 } as any,
    idBarW: { backgroundColor: "#f1ecdf", height: 20 } as any,
    idBackGrid: { flex: 1, flexDirection: "row", paddingHorizontal: 20, paddingTop: 14, gap: 22 } as any,
    idBackCol: { flex: 1 } as any,
    idFRow: { marginBottom: 8 } as any,
    idFLabel: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: "#8a7f6a", fontWeight: "900" } as any,
    idFVal: { fontFamily: theme.font.body, fontSize: 18, letterSpacing: 0.5, color: "#15151a", fontWeight: "800", marginTop: 1 } as any,
    idFDot: { height: 1, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.18)", borderStyle: "dotted", marginTop: 3 } as any,
    samplesWrap: { flexDirection: "row", gap: 18, padding: 12, justifyContent: "center", flexWrap: "wrap" } as any,
    sampleCard: { alignItems: "center", gap: 8, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12 } as any,
    sampleLabel: { fontFamily: theme.font.display, fontSize: 11, letterSpacing: 2, color: theme.color.yellow, textAlign: "center" } as any,
    sampleSub: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.55)", textAlign: "center" } as any,
    samplePick: { marginTop: 6, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1.5, borderColor: theme.color.crimson, backgroundColor: "transparent", borderRadius: 6 } as any,
    samplePickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any,
    samplePickTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: theme.color.crimson, fontWeight: "900", textAlign: "center" } as any,
    samplePickTxtOn: { color: "#fff" } as any
  } as any);
