/* DOSSIER — Enhanced Sample B — vertical DOSSIER, paper center/right, selector far right (scrollable), Persona accents, slide-in + hover */
import { View, Text, StyleSheet, Platform, Pressable, Image, ScrollView } from "react-native";
import { useEffect, useState } from "react";
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
          <style>{`@keyframes dossierPaperIn{0%{opacity:0;transform:translateY(110vh) rotate(1deg) scale(0.96) skewX(-0.6deg)}55%{opacity:1;transform:translateY(-14px) rotate(-0.8deg) scale(1.02) skewX(-0.6deg)}100%{opacity:1;transform:translateY(0) rotate(-0.6deg) skewX(-0.6deg)}}@keyframes p5-burstSpin{from{transform:rotate(45deg)}to{transform:rotate(405deg)}}@keyframes dossierTapeWiggle{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(-1deg)}}`}</style>
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

/* ================= ENHANCED DOSSIER VIEW — paper center/right, selector far right scrollable ================= */
function EnhancedDossier({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  const firstOpen = data.students.find((st) => st.id <= nextId) ?? data.students[0];
  const [sel, setSel] = useState<number>(firstOpen.id);
  const cur = data.students.find((st) => st.id === sel)!;
  const locked = cur.id > nextId;
  const d = DOSSIER[cur.id] ?? DOSSIER[1];

  return (
    <View style={s.wrap as any}>
      {/* vertical DOSSIER — under MENU back button, like other pages */}
      <View style={s.titleCol as any}>
        {["D", "O", "S", "S", "I", "E", "R"].map((ch, i) => (
          <Text
            key={i}
            style={[
              s.vLetter as any,
              i % 3 === 0 && (s.vLetterC as any),
              i % 3 === 2 && (s.vLetterY as any),
              web && ({ animation: `p5-logoLetter 560ms ${70 + i * 55}ms cubic-bezier(0.16,1,0.3,1) both` } as any),
            ]}
          >
            {ch}
          </Text>
        ))}
        <View style={[s.titleRibbon as any, web && ({ animation: "heroIn 480ms 520ms both" } as any)]} pointerEvents="none">
          <Text style={s.titleRibbonTxt as any}>13 FILES</Text>
        </View>
        <View style={[s.titleNote as any, web && ({ animation: "heroIn 480ms 600ms both" } as any)]} pointerEvents="none">
          <Text style={s.titleNoteTxt as any}>CLASSIFIED</Text>
          <Text style={s.titleNoteSub as any}>ALREADY OPEN: {String(nextId).padStart(2, "0")}/13</Text>
        </View>
      </View>

      {/* paper + selector row — both shoved to the right so title breathes */}
      <View style={s.contentRow as any}>
        {/* paper — slide in from bottom every time sel changes, hover/click lift */}
        <View style={s.paperCol as any}>
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
                      <Text style={s.docKicker as any}>FILE NO. {String(cur.id).padStart(3, "0")} — {d.position.toUpperCase()} — TIER {cur.tier}</Text>
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
        </View>

        {/* selector — far right, scrollable */}
        <View style={s.selectorWrap as any}>
          <Text style={s.selectorKicker as any}>SELECT FILE — {String(data.students.length).padStart(2, "0")} SEATS</Text>
          <ScrollView style={s.selectorScroll as any} contentContainerStyle={s.selectorContent as any} showsVerticalScrollIndicator={false}>
            {data.students.map((st, i) => {
              const lk = st.id > nextId;
              const on = st.id === sel;
              const r = rankOf(st.id);
              return (
                <Pressable
                  key={st.id}
                  onPress={() => {
                    if (st.id === sel) {
                      playHover();
                      return;
                    }
                    playClick();
                    setSel(st.id);
                  }}
                  onHoverIn={playHover}
                  style={({ hovered }) => [
                    s.tab as any,
                    on && (s.tabOn as any),
                    lk && (s.tabLocked as any),
                    hovered && !on && (s.tabHov as any),
                    web && ({ animation: `rowIn 380ms ${70 + i * 28}ms both` } as any),
                  ]}
                >
                  <View style={[s.tabRank as any, on && (s.tabRankOn as any), lk && (s.tabRankLocked as any)]}>
                    <Text style={[s.tabRankNum as any, on && (s.tabRankNumOn as any)]}>{r}</Text>
                    <Text style={[s.tabRankSuit as any, on && (s.tabRankSuitOn as any)]}>♣</Text>
                  </View>
                  <View style={s.tabRight as any}>
                    <Text style={[s.tabName as any, on && (s.tabNameOn as any)]} numberOfLines={1}>
                      {lk ? "████████" : DOSSIER[st.id]?.codename ?? `SEAT ${String(st.id).padStart(2, "0")}`}
                    </Text>
                    <Text style={[s.tabSub as any, on && (s.tabSubOn as any)]}>
                      {st.cleared ? "PACIFIED" : lk ? "SEALED" : st.id === nextId ? "TARGET" : "ON FILE"}
                    </Text>
                  </View>
                  {on && <View style={s.tabDot as any} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={s.selectorFoot as any}>SCROLL TO BROWSE — 13 FILES</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,
  loadingTxt: { fontFamily: theme.font.display, fontSize: 32, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textAlign: "center", marginTop: "40%" } as any,

  /* ===== stage accents ===== */
  envSlashL: { position: "absolute", top: "-10%", left: "-6%", width: "32%", height: "120%", transform: [{ skewX: "-18deg" }], overflow: "hidden", zIndex: 0 } as any,
  envSlashLIn: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson, opacity: 0.095 } as any,
  envSlashR: { position: "absolute", top: "-10%", right: "-7%", width: "26%", height: "120%", transform: [{ skewX: "16deg" }], overflow: "hidden", zIndex: 0 } as any,
  envSlashRIn: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimsonDeep, opacity: 0.085 } as any,
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
    transform: [{ rotate: "45deg" }],
    ...(web ? { backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.55) 0deg 5deg, transparent 5deg 11deg)", animation: "p5-burstSpin 28s linear infinite" } as any : {}),
    zIndex: 0,
  } as any,
  ghost: {
    position: "absolute",
    right: "1.5%",
    top: "4%",
    fontFamily: theme.font.display,
    fontSize: 420,
    lineHeight: 400,
    color: "transparent",
    ...(web ? ({ WebkitTextStroke: "3px rgba(252,238,33,0.09)" } as any) : {}),
    zIndex: 0,
    opacity: 0.9,
    transform: [{ skewX: "-8deg" }],
  } as any,
  halftoneA: {
    position: "absolute",
    top: "9%",
    left: "18%",
    width: 220,
    height: 140,
    opacity: 0.11,
    transform: [{ rotate: "-8deg" }, { skewX: "-6deg" }],
    zIndex: 1,
    ...(web ? { backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)", backgroundSize: "14px 14px" } as any : {}),
  } as any,
  halftoneB: {
    position: "absolute",
    bottom: "16%",
    left: "34%",
    width: 180,
    height: 120,
    opacity: 0.08,
    transform: [{ rotate: "12deg" }],
    zIndex: 1,
    ...(web ? { backgroundImage: "radial-gradient(circle, #E60012 1.4px, transparent 1.7px)", backgroundSize: "12px 12px" } as any : {}),
  } as any,
  halftoneC: {
    position: "absolute",
    top: "12%",
    right: "8%",
    width: 140,
    height: 100,
    opacity: 0.09,
    transform: [{ rotate: "-14deg" }],
    zIndex: 1,
    ...(web ? { backgroundImage: "radial-gradient(circle, #FFFFFF 1.3px, transparent 1.6px)", backgroundSize: "12px 12px" } as any : {}),
  } as any,
  linesWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1 } as any,
  diamond: { position: "absolute", textShadow: "2px 2px 0 rgba(0,0,0,0.55)", ...(web ? ({ animation: "p5-float 3.6s ease-in-out infinite" } as any) : {}) } as any,
  driftGlyph: { position: "absolute", fontFamily: theme.font.display, color: theme.color.crimson, textShadow: "2px 2px 0 rgba(0,0,0,0.5)", ...(web ? ({ animation: "p5-float 5s ease-in-out infinite" } as any) : {}) } as any,
  tapeFloor: { position: "absolute", bottom: 0, left: 0, right: 0, overflow: "hidden", zIndex: 5, opacity: 0.92 } as any,

  /* ===== layout ===== */
  wrap: { flex: 1, flexDirection: "row", gap: 28, paddingHorizontal: "2.5%", paddingTop: 84, paddingBottom: 28, zIndex: 3 } as any,
  titleCol: { width: 112, alignItems: "center", paddingTop: 6 } as any,
  vLetter: { fontFamily: theme.font.display, fontSize: 62, lineHeight: 62, color: theme.color.paper, textShadow: `4px 4px 0 ${theme.color.crimson}`, textAlign: "center", letterSpacing: 1 } as any,
  vLetterC: { color: theme.color.crimson, textShadow: `4px 4px 0 ${theme.color.paper}` } as any,
  vLetterY: { color: theme.color.yellow, textShadow: `3px 3px 0 ${theme.color.black}` } as any,
  titleRibbon: {
    marginTop: 14,
    backgroundColor: theme.color.yellow,
    borderWidth: 3,
    borderColor: theme.color.black,
    paddingVertical: 6,
    paddingHorizontal: 12,
    transform: [{ rotate: "-3deg" }, { skewX: "-6deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
  } as any,
  titleRibbonTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, fontWeight: "900", color: theme.color.black } as any,
  titleNote: {
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    transform: [{ rotate: "-1deg" }, { skewX: "-4deg" }],
    gap: 2,
    alignItems: "center",
  } as any,
  titleNoteTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2.5, color: theme.color.yellow, fontWeight: "800" } as any,
  titleNoteSub: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.55)", fontWeight: "700" } as any,

  contentRow: { flex: 1, flexDirection: "row", gap: 22, alignItems: "stretch", justifyContent: "flex-end" } as any,
  paperCol: { flex: 1, maxWidth: 1060, justifyContent: "center" } as any,
  docAnimWrap: { flex: 1 } as any,

  selectorWrap: { width: 304, alignSelf: "stretch", gap: 8 } as any,
  selectorKicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.5)", fontWeight: "800", transform: [{ skewX: "-6deg" }] } as any,
  selectorScroll: { flex: 1 } as any,
  selectorContent: { gap: 8, paddingRight: 4, paddingBottom: 8 } as any,
  selectorFoot: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.28)", textAlign: "center", marginTop: 2 } as any,

  /* tabs (far right) */
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#2c2c2c",
    borderLeftWidth: 6,
    borderLeftColor: "#3a3a3a",
    paddingVertical: 13,
    paddingHorizontal: 14,
    transform: [{ skewX: "-6deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    ...(web ? ({ transition: "transform 160ms ease, background-color 160ms, border-color 160ms, box-shadow 160ms" } as any) : {}),
  } as any,
  tabOn: { backgroundColor: theme.color.paper, borderLeftColor: theme.color.crimson, borderColor: theme.color.paper, transform: [{ skewX: "-6deg" }, { translateX: 10 }], shadowOpacity: 0.55, shadowOffset: { width: 6, height: 6 } } as any,
  tabLocked: { opacity: 0.52 } as any,
  tabHov: { borderLeftColor: theme.color.yellow, backgroundColor: "#222", transform: [{ skewX: "-6deg" }, { translateX: 6 }] } as any,
  tabRank: { width: 44, height: 44, borderWidth: 2, borderColor: "#333", alignItems: "center", justifyContent: "center", backgroundColor: "#0f0f0f", transform: [{ rotate: "-2deg" }] } as any,
  tabRankOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.black } as any,
  tabRankLocked: { backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" } as any,
  tabRankNum: { fontFamily: theme.font.display, fontSize: 19, lineHeight: 19, color: "#5a5a5a", fontWeight: "900" } as any,
  tabRankNumOn: { color: theme.color.paper } as any,
  tabRankSuit: { fontFamily: theme.font.display, fontSize: 13, lineHeight: 13, color: "#5a5a5a", marginTop: -2 } as any,
  tabRankSuitOn: { color: theme.color.yellow } as any,
  tabRight: { flex: 1, gap: 1 } as any,
  tabName: { fontFamily: theme.font.display, fontSize: 16, color: "#8a8a8a", letterSpacing: 1 } as any,
  tabNameOn: { color: theme.color.black } as any,
  tabSub: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "#555", fontWeight: "800" } as any,
  tabSubOn: { color: theme.color.crimson } as any,
  tabDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: theme.color.crimson, marginLeft: 6 } as any,

  /* ===== doc (paper) — bigger, heavier shadows, more halftone ===== */
  doc: {
    flex: 1,
    backgroundColor: "#f6f1e3",
    transform: [{ rotate: "-0.6deg" }, { skewX: "-0.6deg" }],
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 42,
    shadowColor: "#000",
    shadowOpacity: 0.62,
    shadowRadius: 0,
    shadowOffset: { width: 14, height: 16 },
    borderWidth: 3,
    borderColor: theme.color.black,
    overflow: "hidden",
    ...(web ? ({ boxShadow: "14px 16px 0 #000, 0 0 0 2px #000" } as any) : {}),
  } as any,
  docHover: {
    transform: [{ rotate: "-0.4deg" }, { skewX: "-0.6deg" }, { translateY: -8 }, { scale: 1.012 }],
    shadowOpacity: 0.72,
    shadowOffset: { width: 18, height: 22 },
    ...(web ? ({ boxShadow: "18px 22px 0 #000, 0 0 0 2px #000", filter: "brightness(1.02) saturate(1.04)" } as any) : {}),
  } as any,
  docPressed: {
    transform: [{ rotate: "-0.6deg" }, { skewX: "-0.6deg" }, { translateY: -2 }, { scale: 0.992 }],
    shadowOpacity: 0.5,
    shadowOffset: { width: 8, height: 10 },
    ...(web ? ({ boxShadow: "8px 10px 0 #000, 0 0 0 2px #000", filter: "brightness(0.98)" } as any) : {}),
  } as any,

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
    transform: [{ rotate: "-14deg" }, { skewX: "-8deg" }],
  } as any,
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
    transform: [{ rotate: "-2deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 3 },
    zIndex: 5,
  } as any,
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
    transform: [{ rotate: "7deg" }],
    zIndex: 6,
  } as any,
  ring: { position: "absolute", bottom: 46, right: 22, width: 86, height: 86, borderRadius: 43, borderWidth: 4, borderColor: "rgba(139,90,43,0.15)" } as any,
  docHalftone: {
    position: "absolute",
    top: -10,
    right: -14,
    width: 156,
    height: 132,
    opacity: 0.095,
    transform: [{ rotate: "12deg" }],
    ...(web ? { backgroundImage: "radial-gradient(circle, #E60012 1.5px, transparent 1.7px)", backgroundSize: "12px 12px" } as any : {}),
  } as any,
  docHalftoneB: {
    position: "absolute",
    bottom: 78,
    left: -12,
    width: 170,
    height: 110,
    opacity: 0.07,
    transform: [{ rotate: "-10deg" }, { skewX: "-6deg" }],
    ...(web ? { backgroundImage: "radial-gradient(circle, #FCEE21 1.4px, transparent 1.6px)", backgroundSize: "13px 13px" } as any : {}),
  } as any,
  docSlash: { position: "absolute", top: "20%", left: "-10%", right: "-10%", height: 3, backgroundColor: theme.color.crimson, opacity: 0.13, transform: [{ rotate: "-2deg" }] } as any,
  docSpeed: {
    position: "absolute",
    top: 64,
    left: "-6%",
    right: "-6%",
    height: 4,
    opacity: 0.09,
    transform: [{ skewX: "-12deg" }],
    ...(web ? { backgroundImage: "repeating-linear-gradient(90deg, rgba(230,0,18,0.9) 0 18px, transparent 18px 34px)" } as any : {}),
  } as any,

  docHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", borderBottomWidth: 3.5, borderBottomColor: theme.color.black, paddingBottom: 12, gap: 16 } as any,
  docKicker: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3.5, color: "#666", fontWeight: "800" } as any,
  docTitle: { fontFamily: theme.font.display, fontSize: 50, color: theme.color.black, marginTop: 6, letterSpacing: 0.8, lineHeight: 52 } as any,
  docSub: { fontFamily: theme.font.body, fontSize: 15, letterSpacing: 1.8, color: "#444", fontWeight: "700", marginTop: 5 } as any,
  stamp: { borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 14, paddingVertical: 7, transform: [{ rotate: "6deg" }], marginTop: 4, backgroundColor: "rgba(255,255,255,0.55)" } as any,
  stampSealed: { borderColor: "#8a8a8a", backgroundColor: "rgba(240,240,240,0.6)" } as any,
  stampHover: { transform: [{ rotate: "4deg" }, { scale: 1.04 }] } as any,
  stampTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: theme.color.crimson, fontWeight: "900" } as any,
  stampTxtSealed: { color: "#8a8a8a" } as any,

  docBody: { flexDirection: "row", gap: 24, marginTop: 18 } as any,
  left: { width: 340, gap: 14 } as any,
  photo: { width: 340, height: 340, backgroundColor: "#0e0e0e", alignItems: "center", justifyContent: "center", borderWidth: 3.5, borderColor: "#d8d0ba", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 0, shadowOffset: { width: 6, height: 6 } } as any,
  photoHover: { borderColor: theme.color.crimson, shadowOpacity: 0.32, shadowOffset: { width: 8, height: 8 } } as any,
  photoImg: { width: "100%", height: "100%" } as any,
  photoRedact: { ...StyleSheet.absoluteFillObject, backgroundColor: "#111" } as any,
  photoQ: { fontFamily: theme.font.display, fontSize: 72, color: "#2a2a2a" } as any,
  photoNo: { position: "absolute", bottom: 8, fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: "#555", fontWeight: "800" } as any,
  photoTag: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.86)", paddingVertical: 5, alignItems: "center" } as any,
  photoTagTxt: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.yellow, fontWeight: "800" } as any,
  photoGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.07, ...(web ? { backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" } as any : {}) } as any,
  photoCorner: { position: "absolute", top: -1, right: -1, width: 28, height: 28, backgroundColor: theme.color.yellow, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: theme.color.black, ...(web ? ({ clipPath: "polygon(100% 0%, 0% 0%, 100% 100%)" } as any) : {}) } as any,

  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 } as any,
  miniCell: { width: "48.2%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 11, paddingHorizontal: 12, gap: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 0, shadowOffset: { width: 2, height: 2 } } as any,
  miniLabel: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2.2, color: theme.color.crimson, fontWeight: "900" } as any,
  miniVal: { fontFamily: theme.font.body, fontSize: 17, color: "#111", fontWeight: "800" } as any,
  miniRedact: { height: 13, backgroundColor: "#111", borderRadius: 2, marginTop: 2 } as any,

  threatRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 } as any,
  threatLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  threatPips: { flexDirection: "row", gap: 3, flex: 1 } as any,
  pip: { flex: 1, height: 9, backgroundColor: "#e8e0c8", borderWidth: 1, borderColor: "#c9b896" } as any,
  pipOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any,
  pipLocked: { backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" } as any,

  record: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 9, paddingHorizontal: 10, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 2, height: 2 } } as any,
  recordTxt: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1.5, color: "#222", fontWeight: "800" } as any,
  recordRedact: { height: 13, width: "70%", backgroundColor: "#111", borderRadius: 2 } as any,

  right: { flex: 1, gap: 14 } as any,
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as any,
  field: { width: "48%", minHeight: 68, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 13, paddingHorizontal: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 2, height: 2 } } as any,
  fieldLabel: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  fieldVal: { fontFamily: theme.font.body, fontSize: 17, color: "#111", fontWeight: "800", marginTop: 5, letterSpacing: 0.4 } as any,
  fieldRedact: { height: 15, marginTop: 5, backgroundColor: "#111", borderRadius: 2 } as any,

  associates: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 11, paddingHorizontal: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 2, height: 2 } } as any,
  associatesLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  assocRow: { flexDirection: "row", gap: 8, marginTop: 9, flexWrap: "wrap" } as any,
  assocChip: { backgroundColor: theme.color.black, paddingHorizontal: 11, paddingVertical: 6, transform: [{ skewX: "-6deg" }], borderWidth: 1, borderColor: theme.color.crimson } as any,
  assocChipLocked: { backgroundColor: "#222", borderColor: "#444" } as any,
  assocTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1.5, color: theme.color.paper, fontWeight: "800" } as any,
  assocTxtLocked: { color: "#777" } as any,

  quoteBox: { backgroundColor: "#fff", borderLeftWidth: 5, borderLeftColor: theme.color.crimson, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", gap: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 2, height: 2 } } as any,
  quoteMark: { fontFamily: theme.font.display, fontSize: 30, lineHeight: 30, color: theme.color.crimson } as any,
  quote: { flex: 1, fontFamily: theme.font.body, fontSize: 16, lineHeight: 22 as any, color: "#222", fontStyle: "italic", fontWeight: "500" } as any,
  quoteRedact: { flex: 1, height: 17, backgroundColor: "#111", borderRadius: 2 } as any,

  caseBox: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 16, paddingHorizontal: 18, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 2, height: 2 } } as any,
  caseHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 } as any,
  caseLabel: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  caseLine: { flex: 1, height: 1.5, backgroundColor: "#d8d0ba" } as any,
  caseBadge: { backgroundColor: theme.color.black, paddingHorizontal: 7, paddingVertical: 3, transform: [{ skewX: "-6deg" }, { rotate: "-1deg" }] } as any,
  caseBadgeTxt: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 1.5, color: theme.color.yellow, fontWeight: "800" } as any,
  caseText: { fontFamily: theme.font.body, fontSize: 16, lineHeight: 23 as any, color: "#222", letterSpacing: 0.2 } as any,
  caseRedactCol: { gap: 7 } as any,
  caseRedact: { height: 14, backgroundColor: "#111", borderRadius: 2 } as any,

  idStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    borderTopWidth: 2.5,
    borderStyle: "dashed",
    borderColor: "#c9b896",
    paddingTop: 12,
  } as any,
  idLeft: { alignItems: "center" } as any,
  idMid: { flex: 1 } as any,
  idRight: { alignItems: "center" } as any,
  idLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: "#8a7f6a", fontWeight: "800" } as any,
  idVal: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1.5, color: "#111", fontWeight: "800", marginTop: 2 } as any,
  idBarcode: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 24 } as any,
  idBar: { backgroundColor: "#111", height: 24 } as any,
  foot: { marginTop: 12, fontFamily: theme.font.body, fontSize: 9, letterSpacing: 3, color: "#9a8f7a", fontWeight: "800", textAlign: "center" } as any,
  docBottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 5, backgroundColor: theme.color.crimson, opacity: 0.92 } as any,
  docBottomBarHov: { height: 7, backgroundColor: theme.color.yellow } as any,
});
