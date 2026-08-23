/* DOSSIER — Sample B redone — 3 premium paper-card variants, selector stays left */
import { View, Text, StyleSheet, Platform, Pressable, Image } from "react-native";
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
    division: "—",
    status: "Under Observation",
    associates: ["3♣", "K♠"],
    quote: "“Was I that open a book?”",
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
  const [sample, setSample] = useState<"1" | "2" | "3">("1");

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
      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />
      {sample === "1" && <Sample1 data={data} />}
      {sample === "2" && <Sample2 data={data} />}
      {sample === "3" && <Sample3 data={data} />}

      <View style={s.swWrap as any}>
        <Text style={s.swTag as any}>SAMPLE</Text>
        {(["1", "2", "3"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => {
              playClick();
              setSample(k);
            }}
            onHoverIn={playHover}
            style={({ hovered }) => [s.swBtn as any, sample === k && (s.swBtnOn as any), hovered && sample !== k && (s.swBtnHov as any)]}
          >
            <Text style={[s.swTxt as any, sample === k && (s.swTxtOn as any)]}>{k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ================= SAMPLE 1 — CONFIDENTIAL DOSSIER (paper + redacted stamp) ================= */
function Sample1({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  const firstOpen = data.students.find((st) => st.id <= nextId) ?? data.students[0];
  const [sel, setSel] = useState<number>(firstOpen.id);
  const cur = data.students.find((st) => st.id === sel)!;
  const locked = cur.id > nextId;
  const d = DOSSIER[cur.id] ?? DOSSIER[1];

  return (
    <View style={s.bStage as any}>
      <View style={s.bPaperBg as any} pointerEvents="none" />
      <View style={s.bHead as any}>
        <Text style={[s.bTitle as any, web && ({ animation: "heroIn 600ms 80ms both" } as any)]}>SECRET FILES</Text>
        <Text style={[s.bSub as any, web && ({ animation: "heroIn 500ms 200ms both" } as any)]}>
          VERTEX INSTITUTE — 13 SEATS DOSSIER — <Text style={{ color: theme.color.crimson } as any}>EYES ONLY</Text>
        </Text>
      </View>

      <View style={s.bRow as any}>
        <View style={s.bTabs as any}>
          {data.students.map((st, i) => {
            const lk = st.id > nextId;
            const on = st.id === sel;
            const r = rankOf(st.id);
            return (
              <Pressable
                key={st.id}
                onPress={() => {
                  playClick();
                  setSel(st.id);
                }}
                onHoverIn={playHover}
                style={({ hovered }) => [
                  s.bTab as any,
                  on && (s.bTabOn as any),
                  lk && (s.bTabLocked as any),
                  hovered && !on && (s.bTabHov as any),
                  web && ({ animation: `rowIn 400ms ${60 + i * 28}ms both` } as any),
                ]}
              >
                <View style={[s.bTabRank as any, on && (s.bTabRankOn as any), lk && (s.bTabRankLocked as any)]}>
                  <Text style={[s.bTabRankNum as any, on && (s.bTabRankNumOn as any)]}>{r}</Text>
                  <Text style={[s.bTabRankSuit as any, on && (s.bTabRankSuitOn as any)]}>♣</Text>
                </View>
                <View style={s.bTabRight as any}>
                  <Text style={[s.bTabName as any, on && (s.bTabNameOn as any)]} numberOfLines={1}>
                    {lk ? "████████" : DOSSIER[st.id]?.codename ?? `SEAT ${String(st.id).padStart(2, "0")}`}
                  </Text>
                  <Text style={[s.bTabSub as any, on && (s.bTabSubOn as any)]}>
                    {st.cleared ? "PACIFIED" : lk ? "SEALED" : st.id === nextId ? "TARGET" : "ON FILE"}
                  </Text>
                </View>
                {on && <View style={s.bTabRedDot as any} />}
              </Pressable>
            );
          })}
        </View>

        <View key={sel} style={[s.bDoc as any, web && ({ animation: "p5-tabR 420ms cubic-bezier(0.16,1,0.3,1) both" } as any)]}>
          <Text style={s.bWatermark as any} pointerEvents="none">
            CONFIDENTIAL
          </Text>
          <View style={s.bTape as any} pointerEvents="none" />
          <View style={s.bClip as any} pointerEvents="none" />
          <View style={s.bRing as any} pointerEvents="none" />
          <View style={s.bDocHalftone as any} pointerEvents="none" />
          <View style={s.bDocSlash as any} pointerEvents="none" />

          <View style={s.bDocHead as any}>
            <View>
              <Text style={s.bDocKicker}>FILE NO. {String(cur.id).padStart(3, "0")} — {d.position.toUpperCase()} — TIER {cur.tier}</Text>
              <Text style={s.bDocTitle}>{locked ? "FILE ████████" : cur.id === 1 ? `${d.codename} — 2♣` : d.codename}</Text>
              <Text style={s.bDocSubTitle}>
                {locked ? "████████ — ██" : d.division === "—" ? d.fullName : `${d.fullName} · ${d.division}`}
              </Text>
            </View>
            <View style={[s.bStamp as any, locked && (s.bStampSealed as any)]}>
              <Text style={[s.bStampTxt as any, locked && (s.bStampTxtSealed as any)]}>{locked ? "SEALED" : cur.cleared ? "PACIFIED" : "TOP SECRET"}</Text>
            </View>
          </View>

          <View style={s.bDocBody as any}>
            <View style={s.bLeft as any}>
              <View style={s.bPhoto as any}>
                {locked ? (
                  <>
                    <View style={s.bPhotoRedact as any} />
                    <Text style={s.bPhotoQ as any}>?</Text>
                    <Text style={s.bPhotoNo as any}>NO PHOTO ON RECORD</Text>
                  </>
                ) : (
                  <>
                    <Image source={{ uri: portraitFor(cur.id) }} style={s.bPhotoImg as any} resizeMode="cover" />
                    <View style={s.bPhotoTag as any}>
                      <Text style={s.bPhotoTagTxt as any}>ID PHOTO — 2×2 — ON FILE</Text>
                    </View>
                    <View style={s.bPhotoGrid as any} pointerEvents="none" />
                  </>
                )}
              </View>

              <View style={s.bMiniGrid as any}>
                {[
                  ["AGE", locked ? "██" : String(d.age)],
                  ["GENDER", locked ? "██" : d.gender],
                  ["BIRTHDAY", locked ? "████" : d.birthday],
                  ["BLOOD", locked ? "█" : d.bloodType],
                ].map(([k, v]) => (
                  <View key={k} style={s.bMiniCell as any}>
                    <Text style={s.bMiniLabel as any}>{k}</Text>
                    {locked ? <View style={s.bMiniRedact as any} /> : <Text style={s.bMiniVal as any}>{v}</Text>}
                  </View>
                ))}
              </View>

              {cur.id !== 1 && (
                <>
                  <View style={s.bThreatRow as any}>
                    <Text style={s.bThreatLabel as any}>THREAT</Text>
                    <View style={s.bThreatPips as any}>
                      {Array.from({ length: 13 }).map((_, p) => (
                        <View key={p} style={[s.bPip as any, p < cur.tier && (s.bPipOn as any), locked && (s.bPipLocked as any)]} />
                      ))}
                    </View>
                  </View>

                  <View style={s.bRecord as any}>
                    {locked ? (
                      <View style={s.bRecordRedact as any} />
                    ) : (
                      <Text style={s.bRecordTxt as any}>
                        {cur.wins}W · {cur.losses}L · {cur.attempts} RUNS · BEST {cur.bestScore}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>

            <View style={s.bRight as any}>
              <View style={s.bFieldGrid as any}>
                {[
                  ["FULL NAME", locked ? "████████ █." : d.fullName],
                  ["POSITION", d.position],
                  ...(d.division === "—" ? [] : ([["DIVISION", locked ? "████████ — ██████" : d.division]] as any)),
                  ["STATUS", locked ? "SEALED" : d.status],
                ].map(([label, val]) => (
                  <View key={label} style={s.bField as any}>
                    <Text style={s.bFieldLabel as any}>{label}</Text>
                    {locked && label !== "POSITION" ? <View style={s.bFieldRedact as any} /> : <Text style={s.bFieldVal as any}>{val}</Text>}
                  </View>
                ))}
              </View>

              <View style={s.bAssociates as any}>
                <Text style={s.bAssociatesLabel as any}>KNOWN ASSOCIATES</Text>
                <View style={s.bAssocRow as any}>
                  {(locked ? ["—", "—", "—"] : d.associates).map((name, idx) => (
                    <View key={idx} style={[s.bAssocChip as any, locked && (s.bAssocChipLocked as any)]}>
                      <Text style={[s.bAssocTxt as any, locked && (s.bAssocTxtLocked as any)]}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={s.bQuoteBox as any}>
                <Text style={s.bQuoteMark as any}>“</Text>
                {locked ? <View style={s.bQuoteRedact as any} /> : <Text style={s.bQuote as any}>{d.quote}</Text>}
              </View>

              <View style={s.bCase as any}>
                <View style={s.bCaseHead as any}>
                  <Text style={s.bCaseLabel as any}>CASE NOTES — HANDLER</Text>
                  <View style={s.bCaseLine as any} />
                </View>
                {locked ? (
                  <View style={s.bCaseRedactCol as any}>
                    <View style={s.bCaseRedact as any} />
                    <View style={[s.bCaseRedact as any, { width: "82%" } as any]} />
                    <View style={[s.bCaseRedact as any, { width: "64%" } as any]} />
                  </View>
                ) : (
                  <Text style={s.bCaseText as any}>{d.lore}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={s.bIdStrip as any}>
            <View style={s.bIdLeft as any}>
              <Text style={s.bIdLabel as any}>FILE</Text>
              <Text style={s.bIdVal as any}>
                {String(cur.id).padStart(2, "0")}–{rankOf(cur.id)}♣
              </Text>
            </View>
            <View style={s.bIdMid as any}>
              <Text style={s.bIdLabel as any}>DIVISION</Text>
              <Text style={[s.bIdVal as any, { fontSize: 9 } as any]}>{locked ? "—" : d.division.split(" —")[0]}</Text>
            </View>
            <View style={s.bIdRight as any}>
              <Text style={s.bIdLabel as any}>ISSUED</Text>
              <Text style={s.bIdVal as any}>2026-08-24</Text>
            </View>
            <View style={s.bIdBarcode as any}>
              {Array.from({ length: 18 }).map((_, bi) => (
                <View key={bi} style={[s.bIdBar as any, { width: bi % 3 === 0 ? 3 : 1.5, opacity: bi % 5 === 0 ? 0.2 : 1 } as any]} />
              ))}
            </View>
          </View>

          <Text style={s.bFoot as any}>HANDLE WITH CARE — PROPERTY OF THE STUDENT COUNCIL — DO NOT DUPLICATE</Text>
        </View>
      </View>
    </View>
  );
}

/* ================= SAMPLE 2 — STUDENT ID (hard plastic card) ================= */
function Sample2({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  const firstOpen = data.students.find((st) => st.id <= nextId) ?? data.students[0];
  const [sel, setSel] = useState<number>(firstOpen.id);
  const cur = data.students.find((st) => st.id === sel)!;
  const locked = cur.id > nextId;
  const d = DOSSIER[cur.id] ?? DOSSIER[1];

  return (
    <View style={s.cStage as any}>
      <View style={s.cHead as any}>
        <Text style={[s.cKicker as any, web && ({ animation: "heroIn 500ms 80ms both" } as any)]}>VERTEX INSTITUTE — STUDENT REGISTRY</Text>
        <Text style={[s.cTitle as any, web && ({ animation: "heroIn 600ms 160ms both" } as any)]}>ID DOSSIER</Text>
      </View>

      <View style={s.cRow as any}>
        <View style={s.cTabs as any}>
          {data.students.map((st, i) => {
            const lk = st.id > nextId;
            const on = st.id === sel;
            return (
              <Pressable
                key={st.id}
                onPress={() => {
                  playClick();
                  setSel(st.id);
                }}
                onHoverIn={playHover}
                style={({ hovered }) => [
                  s.cTab as any,
                  on && (s.cTabOn as any),
                  lk && (s.cTabLocked as any),
                  hovered && !on && (s.cTabHov as any),
                  web && ({ animation: `rowIn 400ms ${50 + i * 26}ms both` } as any),
                ]}
              >
                <Text style={[s.cTabRank as any, on && (s.cTabRankOn as any)]}>{rankOf(st.id)}♣</Text>
                <Text style={[s.cTabName as any, on && (s.cTabNameOn as any)]} numberOfLines={1}>
                  {lk ? "LOCKED" : st.id === sel ? d.codename : rankOf(st.id) + " ♣"}
                </Text>
                <View style={[s.cTabDot as any, on && (s.cTabDotOn as any), lk && (s.cTabDotLocked as any)]} />
              </Pressable>
            );
          })}
        </View>

        <View key={sel} style={[s.cCard as any, web && ({ animation: "cardToChallenge 520ms cubic-bezier(0.16,1,0.3,1) both" } as any)]}>
          {/* lanyard hole */}
          <View style={s.cHole as any} />
          {/* holographic stripe */}
          <View style={s.cHolo as any} pointerEvents="none" />
          {/* red corner slash */}
          <View style={s.cCorner as any} pointerEvents="none" />

          <View style={s.cCardHead as any}>
            <View style={s.cCardHeadLeft as any}>
              <Text style={s.cCardKicker as any}>VERTEX INSTITUTE — STUDENT ID</Text>
              <Text style={s.cCardName as any}>{locked ? "████████" : d.fullName}</Text>
              <Text style={s.cCardSub as any}>{locked ? "████████" : `${d.codename} · ${d.position}`}</Text>
            </View>
            <View style={[s.cCardStamp as any, locked && (s.cCardStampLocked as any)]}>
              <Text style={[s.cCardStampTxt as any, locked && (s.cCardStampTxtLocked as any)]}>{locked ? "VOID" : cur.cleared ? "PACIFIED" : "VALID"}</Text>
            </View>
          </View>

          <View style={s.cCardBody as any}>
            <View style={s.cPhotoWrap as any}>
              <View style={s.cPhoto as any}>
                {locked ? (
                  <Text style={s.cPhotoQ as any}>?</Text>
                ) : (
                  <Image source={{ uri: portraitFor(cur.id) }} style={s.cPhotoImg as any} resizeMode="cover" />
                )}
              </View>
              <View style={s.cPhotoMeta as any}>
                <Text style={s.cPhotoMetaLabel as any}>SEAT</Text>
                <Text style={s.cPhotoMetaVal as any}>{String(cur.id).padStart(2, "0")}</Text>
              </View>
            </View>

            <View style={s.cFields as any}>
              {[
                ["AGE", locked ? "██" : String(d.age)],
                ["GENDER", locked ? "██" : d.gender],
                ["BIRTHDAY", locked ? "████" : d.birthday],
                ["BLOOD", locked ? "█" : d.bloodType],
                ["DIVISION", locked ? "████" : d.division.split(" —")[0]],
                ["STATUS", locked ? "SEALED" : d.status],
              ].map(([k, v]) => (
                <View key={k} style={s.cField as any}>
                  <Text style={s.cFieldLabel as any}>{k}</Text>
                  {locked ? <View style={s.cFieldRedact as any} /> : <Text style={s.cFieldVal as any}>{v}</Text>}
                </View>
              ))}
            </View>

            <View style={s.cRightCol as any}>
              <View style={s.cQuoteSm as any}>
                <Text style={s.cQuoteSmMark as any}>“</Text>
                {locked ? <View style={s.cQuoteSmRedact as any} /> : <Text style={s.cQuoteSmTxt as any}>{d.quote}</Text>}
              </View>
              <View style={s.cAssociatesSm as any}>
                <Text style={s.cAssociatesSmLabel as any}>ASSOCIATES</Text>
                <View style={s.cAssocSmRow as any}>
                  {(locked ? ["—", "—"] : d.associates.slice(0, 2)).map((n, idx) => (
                    <View key={idx} style={s.cAssocSmChip as any}>
                      <Text style={s.cAssocSmTxt as any}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.cThreatSm as any}>
                <Text style={s.cThreatSmLabel as any}>THREAT</Text>
                <View style={s.cThreatSmBar as any}>
                  <View style={[s.cThreatSmFill as any, { width: `${(cur.tier / 13) * 100}%` } as any]} />
                </View>
              </View>
            </View>
          </View>

          <View style={s.cCardFoot as any}>
            <Text style={s.cCardFootLabel as any}>DOSSIER FILE</Text>
            <Text style={s.cCardFootVal as any}>
              {String(cur.id).padStart(2, "0")}–{rankOf(cur.id)}♣ · TIER {cur.tier} · {locked ? "REDACTED" : d.division}
            </Text>
            <View style={s.cBarcodeSm as any}>
              {Array.from({ length: 14 }).map((_, bi) => (
                <View key={bi} style={[s.cBarSm as any, { width: bi % 3 === 0 ? 2.5 : 1, opacity: bi % 4 === 0 ? 0.3 : 1 } as any]} />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ================= SAMPLE 3 — CASE BOARD (evidence + lore) ================= */
function Sample3({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  const firstOpen = data.students.find((st) => st.id <= nextId) ?? data.students[0];
  const [sel, setSel] = useState<number>(firstOpen.id);
  const cur = data.students.find((st) => st.id === sel)!;
  const locked = cur.id > nextId;
  const d = DOSSIER[cur.id] ?? DOSSIER[1];

  return (
    <View style={s.dStage as any}>
      {/* red string web behind */}
      <View style={s.dStrings as any} pointerEvents="none">
        {[
          { t: "22%", r: -12 },
          { t: "48%", r: 8 },
          { t: "68%", r: -9 },
        ].map((L, i) => (
          <View key={i} style={[s.dString as any, { top: L.t, transform: [{ rotate: L.r + "deg" }] } as any]} />
        ))}
      </View>

      <View style={s.dHead as any}>
        <Text style={[s.dTitle as any, web && ({ animation: "heroIn 600ms 80ms both" } as any)]}>CASE BOARD</Text>
        <Text style={[s.dSub as any, web && ({ animation: "heroIn 500ms 200ms both" } as any)]}>EVIDENCE WALL — 13 SEATS — FOLLOW THE STRING</Text>
      </View>

      <View style={s.dRow as any}>
        <View style={s.dTabs as any}>
          {data.students.map((st, i) => {
            const lk = st.id > nextId;
            const on = st.id === sel;
            return (
              <Pressable
                key={st.id}
                onPress={() => {
                  playClick();
                  setSel(st.id);
                }}
                onHoverIn={playHover}
                style={({ hovered }) => [
                  s.dTab as any,
                  on && (s.dTabOn as any),
                  lk && (s.dTabLocked as any),
                  hovered && !on && (s.dTabHov as any),
                  web && ({ animation: `rowIn 380ms ${50 + i * 28}ms both` } as any),
                ]}
              >
                <Text style={[s.dTabNum as any, on && (s.dTabNumOn as any)]}>{rankOf(st.id)}♣</Text>
                <Text style={[s.dTabName as any, on && (s.dTabNameOn as any)]} numberOfLines={1}>
                  {lk ? "SEALED" : DOSSIER[st.id]?.codename ?? st.seat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View key={sel} style={[s.dBoardCard as any, web && ({ animation: "p5-tabR 420ms cubic-bezier(0.16,1,0.3,1) both" } as any)]}>
          <View style={s.dBoardTape as any} pointerEvents="none" />
          <View style={s.dBoardClip as any} pointerEvents="none" />
          <Text style={s.dBoardWatermark as any} pointerEvents="none">
            EVIDENCE
          </Text>

          <View style={s.dBoardHead as any}>
            <Text style={s.dBoardKicker as any}>
              CASE #{String(cur.id).padStart(3, "0")} — {d.position.toUpperCase()}
            </Text>
            <Text style={s.dBoardTitle as any}>{locked ? "████████" : d.codename}</Text>
            <Text style={s.dBoardSub as any}>{locked ? "████████" : `${d.fullName} · ${d.division}`}</Text>
          </View>

          <View style={s.dBoardBody as any}>
            <View style={s.dBoardPhoto as any}>
              {locked ? (
                <Text style={s.dBoardPhotoQ as any}>?</Text>
              ) : (
                <Image source={{ uri: portraitFor(cur.id) }} style={s.dBoardPhotoImg as any} resizeMode="cover" />
              )}
              <View style={s.dBoardPhotoPin as any} />
            </View>

            <View style={s.dBoardRight as any}>
              <View style={s.dBoardGrid as any}>
                {[
                  ["AGE", locked ? "██" : String(d.age)],
                  ["GENDER", locked ? "██" : d.gender],
                  ["BIRTHDAY", locked ? "████" : d.birthday],
                  ["DIVISION", locked ? "████████" : d.division.split(" —")[0]],
                ].map(([k, v]) => (
                  <View key={k} style={s.dBoardField as any}>
                    <Text style={s.dBoardFieldLabel as any}>{k}</Text>
                    {locked ? <View style={s.dBoardFieldRedact as any} /> : <Text style={s.dBoardFieldVal as any}>{v}</Text>}
                  </View>
                ))}
              </View>

              <View style={s.dBoardQuote as any}>
                <Text style={s.dBoardQuoteMark as any}>“</Text>
                {locked ? <View style={s.dBoardQuoteRedact as any} /> : <Text style={s.dBoardQuoteTxt as any}>{d.quote}</Text>}
              </View>

              <View style={s.dBoardLore as any}>
                <Text style={s.dBoardLoreLabel as any}>HANDLER NOTES</Text>
                {locked ? (
                  <View style={s.dBoardLoreRedactCol as any}>
                    <View style={s.dBoardLoreRedact as any} />
                    <View style={[s.dBoardLoreRedact as any, { width: "88%" } as any]} />
                  </View>
                ) : (
                  <Text style={s.dBoardLoreTxt as any}>{d.lore}</Text>
                )}
              </View>

              <View style={s.dBoardAssociates as any}>
                <Text style={s.dBoardAssocLabel as any}>LINKED FILES</Text>
                <View style={s.dBoardAssocRow as any}>
                  {(locked ? ["—", "—", "—"] : d.associates).map((n, idx) => (
                    <View key={idx} style={s.dBoardAssocChip as any}>
                      <Text style={s.dBoardAssocTxt as any}>{n}</Text>
                      {idx < d.associates.length - 1 && <View style={s.dBoardStringDot as any} />}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={s.dBoardFoot as any}>
            <Text style={s.dBoardFootLabel as any}>FILE</Text>
            <Text style={s.dBoardFootVal as any}>
              {String(cur.id).padStart(2, "0")}–{rankOf(cur.id)}♣
            </Text>
            <View style={s.dBoardFootLine as any} />
            <Text style={s.dBoardFootLabel as any}>TIER</Text>
            <Text style={s.dBoardFootVal as any}>{cur.tier}</Text>
          </View>
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

  swWrap: { position: "absolute", bottom: 18, right: 18, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 99 } as any,
  swTag: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.4)", fontWeight: "800" } as any,
  swBtn: { width: 44, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#161616", borderWidth: 2, borderColor: "#333", transform: [{ skewX: "-10deg" }] } as any,
  swBtnOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  swBtnHov: { borderColor: theme.color.yellow } as any,
  swTxt: { fontFamily: theme.font.display, fontSize: 18, color: "#777" } as any,
  swTxtOn: { color: theme.color.paper } as any,

  /* ===== B (Sample 1) — paper file ===== */
  bStage: { flex: 1, paddingTop: 72, paddingBottom: 22, paddingHorizontal: "2.8%", zIndex: 2 } as any,
  bPaperBg: {
    position: "absolute",
    top: "-10%",
    left: "-5%",
    right: "-5%",
    bottom: "-10%",
    opacity: 0.06,
    transform: [{ rotate: "-1.2deg" }],
    ...(web
      ? ({
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 40px)",
        } as any)
      : {}),
  } as any,
  bHead: { marginBottom: 18, paddingLeft: 8 } as any,
  bTitle: { fontFamily: theme.font.display, fontSize: 60, color: theme.color.paper, letterSpacing: 4, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  bSub: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 8 } as any,
  bRow: { flex: 1, flexDirection: "row", gap: 22 } as any,
  bTabs: { width: 280, gap: 8 } as any,
  bTab: {
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    transform: [{ skewX: "-6deg" }],
    ...(web ? ({ transition: "transform 160ms ease, background-color 160ms, border-color 160ms" } as any) : {}),
  } as any,
  bTabOn: { backgroundColor: theme.color.paper, borderLeftColor: theme.color.crimson, borderColor: theme.color.paper, transform: [{ skewX: "-6deg" }, { translateX: 14 }] } as any,
  bTabLocked: { opacity: 0.5 } as any,
  bTabHov: { borderLeftColor: theme.color.yellow } as any,
  bTabRank: { width: 40, height: 40, borderWidth: 2, borderColor: "#333", alignItems: "center", justifyContent: "center", backgroundColor: "#0f0f0f", transform: [{ rotate: "-2deg" }] } as any,
  bTabRankOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.black } as any,
  bTabRankLocked: { backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" } as any,
  bTabRankNum: { fontFamily: theme.font.display, fontSize: 18, lineHeight: 18, color: "#5a5a5a", fontWeight: "900" } as any,
  bTabRankNumOn: { color: theme.color.paper } as any,
  bTabRankSuit: { fontFamily: theme.font.display, fontSize: 12, lineHeight: 12, color: "#5a5a5a", marginTop: -2 } as any,
  bTabRankSuitOn: { color: theme.color.yellow } as any,
  bTabRight: { flex: 1, gap: 1 } as any,
  bTabName: { fontFamily: theme.font.display, fontSize: 15, color: "#8a8a8a", letterSpacing: 1 } as any,
  bTabNameOn: { color: theme.color.black } as any,
  bTabSub: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "#555", fontWeight: "800" } as any,
  bTabSubOn: { color: theme.color.crimson } as any,
  bTabRedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.crimson, marginLeft: 6 } as any,

  bDoc: {
    flex: 1,
    maxWidth: 980,
    backgroundColor: "#f6f1e3",
    transform: [{ rotate: "-0.6deg" }, { skewX: "-0.6deg" }],
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 34,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 0,
    shadowOffset: { width: 10, height: 12 },
    overflow: "hidden",
  } as any,
  bWatermark: {
    position: "absolute",
    top: "38%",
    left: "-6%",
    right: "-6%",
    textAlign: "center",
    fontFamily: theme.font.display,
    fontSize: 96,
    letterSpacing: 14,
    color: theme.color.crimson,
    opacity: 0.06,
    transform: [{ rotate: "-14deg" }, { skewX: "-8deg" }],
  } as any,
  bTape: {
    position: "absolute",
    top: -10,
    left: "42%",
    width: 110,
    height: 28,
    backgroundColor: "rgba(252,238,33,0.82)",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    transform: [{ rotate: "-2deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 3 },
  } as any,
  bClip: {
    position: "absolute",
    top: -12,
    right: 54,
    width: 28,
    height: 56,
    borderWidth: 4,
    borderTopColor: "transparent",
    borderLeftColor: "#9a9a9a",
    borderRightColor: "#9a9a9a",
    borderBottomColor: "#9a9a9a",
    borderRadius: 8,
    transform: [{ rotate: "7deg" }],
    zIndex: 4,
  } as any,
  bRing: { position: "absolute", bottom: 44, right: 22, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "rgba(139,90,43,0.16)" } as any,
  bDocHalftone: {
    position: "absolute",
    top: -8,
    right: -12,
    width: 140,
    height: 120,
    opacity: 0.09,
    transform: [{ rotate: "12deg" }],
    ...(web ? { backgroundImage: "radial-gradient(circle, #E60012 1.4px, transparent 1.6px)", backgroundSize: "12px 12px" } as any : {}),
  } as any,
  bDocSlash: { position: "absolute", top: "18%", left: "-10%", right: "-10%", height: 3, backgroundColor: theme.color.crimson, opacity: 0.14, transform: [{ rotate: "-2deg" }] } as any,

  bDocHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", borderBottomWidth: 3, borderBottomColor: theme.color.black, paddingBottom: 10 } as any,
  bDocKicker: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: "#777", fontWeight: "800" } as any,
  bDocTitle: { fontFamily: theme.font.display, fontSize: 38, color: theme.color.black, marginTop: 4, letterSpacing: 0.5 } as any,
  bDocSubTitle: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 2, color: "#555", fontWeight: "700", marginTop: 4 } as any,
  bStamp: { borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "6deg" }], marginTop: 4 } as any,
  bStampSealed: { borderColor: "#8a8a8a" } as any,
  bStampTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.crimson, fontWeight: "900" } as any,
  bStampTxtSealed: { color: "#8a8a8a" } as any,

  bDocBody: { flexDirection: "row", gap: 22, marginTop: 16 } as any,
  bLeft: { width: 240, gap: 14 } as any,
  bPhoto: { width: 240, height: 240, backgroundColor: "#0e0e0e", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#d8d0ba", overflow: "hidden" } as any,
  bPhotoImg: { width: "100%", height: "100%" } as any,
  bPhotoRedact: { ...StyleSheet.absoluteFillObject, backgroundColor: "#111" } as any,
  bPhotoQ: { fontFamily: theme.font.display, fontSize: 64, color: "#2a2a2a" } as any,
  bPhotoNo: { position: "absolute", bottom: 6, fontFamily: theme.font.body, fontSize: 7, letterSpacing: 2, color: "#555", fontWeight: "800" } as any,
  bPhotoTag: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.82)", paddingVertical: 4, alignItems: "center" } as any,
  bPhotoTagTxt: { fontFamily: theme.font.body, fontSize: 7, letterSpacing: 2, color: theme.color.yellow, fontWeight: "800" } as any,
  bPhotoGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.06, ...(web ? { backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" } as any : {}) } as any,

  bMiniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as any,
  bMiniCell: { width: "48%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10, gap: 3 } as any,
  bMiniLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  bMiniVal: { fontFamily: theme.font.body, fontSize: 13, color: "#111", fontWeight: "800" } as any,
  bMiniRedact: { height: 12, backgroundColor: "#111", borderRadius: 2, marginTop: 2 } as any,

  bThreatRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 } as any,
  bThreatLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  bThreatPips: { flexDirection: "row", gap: 3, flex: 1 } as any,
  bPip: { flex: 1, height: 8, backgroundColor: "#e8e0c8", borderWidth: 1, borderColor: "#c9b896" } as any,
  bPipOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any,
  bPipLocked: { backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" } as any,

  bRecord: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10, alignItems: "center" } as any,
  bRecordTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1.5, color: "#222", fontWeight: "800" } as any,
  bRecordRedact: { height: 12, width: "70%", backgroundColor: "#111", borderRadius: 2 } as any,

  bRight: { flex: 1, gap: 14 } as any,
  bFieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as any,
  bField: { width: "48%", minHeight: 52, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 10, paddingHorizontal: 12 } as any,
  bFieldLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  bFieldVal: { fontFamily: theme.font.body, fontSize: 14, color: "#111", fontWeight: "800", marginTop: 3, letterSpacing: 0.5 } as any,
  bFieldRedact: { height: 14, marginTop: 4, backgroundColor: "#111", borderRadius: 2 } as any,

  bAssociates: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 10, paddingHorizontal: 12 } as any,
  bAssociatesLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  bAssocRow: { flexDirection: "row", gap: 8, marginTop: 8 } as any,
  bAssocChip: { backgroundColor: theme.color.black, paddingHorizontal: 10, paddingVertical: 5, transform: [{ skewX: "-6deg" }], borderWidth: 1, borderColor: theme.color.crimson } as any,
  bAssocChipLocked: { backgroundColor: "#222", borderColor: "#444" } as any,
  bAssocTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1.5, color: theme.color.paper, fontWeight: "800" } as any,
  bAssocTxtLocked: { color: "#777" } as any,

  bQuoteBox: { backgroundColor: "#fff", borderLeftWidth: 4, borderLeftColor: theme.color.crimson, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", gap: 10 } as any,
  bQuoteMark: { fontFamily: theme.font.display, fontSize: 26, lineHeight: 26, color: theme.color.crimson } as any,
  bQuote: { flex: 1, fontFamily: theme.font.body, fontSize: 13, lineHeight: 18 as any, color: "#222", fontStyle: "italic" } as any,
  bQuoteRedact: { flex: 1, height: 16, backgroundColor: "#111", borderRadius: 2 } as any,

  bCase: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 14, paddingHorizontal: 16 } as any,
  bCaseHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 } as any,
  bCaseLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  bCaseLine: { flex: 1, height: 1, backgroundColor: "#d8d0ba" } as any,
  bCaseText: { fontFamily: theme.font.body, fontSize: 13, lineHeight: 19 as any, color: "#222" } as any,
  bCaseRedactCol: { gap: 6 } as any,
  bCaseRedact: { height: 13, backgroundColor: "#111", borderRadius: 2 } as any,

  bIdStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 14,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: "#c9b896",
    paddingTop: 10,
  } as any,
  bIdLeft: { alignItems: "center" } as any,
  bIdMid: { flex: 1 } as any,
  bIdRight: { alignItems: "center" } as any,
  bIdLabel: { fontFamily: theme.font.body, fontSize: 7, letterSpacing: 2, color: "#8a7f6a", fontWeight: "800" } as any,
  bIdVal: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1.5, color: "#111", fontWeight: "800", marginTop: 2 } as any,
  bIdBarcode: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 22 } as any,
  bIdBar: { backgroundColor: "#111", height: 22 } as any,
  bFoot: { marginTop: 10, fontFamily: theme.font.body, fontSize: 8, letterSpacing: 3, color: "#9a8f7a", fontWeight: "800", textAlign: "center" } as any,

  /* ===== SAMPLE 2 — ID CARD ===== */
  cStage: { flex: 1, paddingTop: 72, paddingBottom: 22, paddingHorizontal: "3.5%", zIndex: 2 } as any,
  cHead: { marginBottom: 18 } as any,
  cTitle: { fontFamily: theme.font.display, fontSize: 48, color: theme.color.paper, letterSpacing: 4, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  cKicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  cRow: { flex: 1, flexDirection: "row", gap: 22 } as any,
  cTabs: { width: 200, gap: 6 } as any,
  cTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    transform: [{ skewX: "-6deg" }],
    ...(web ? ({ transition: "border-color 160ms, transform 160ms" } as any) : {}),
  } as any,
  cTabOn: { backgroundColor: theme.color.paper, borderColor: theme.color.crimson, transform: [{ skewX: "-6deg" }, { translateX: 10 }] } as any,
  cTabLocked: { opacity: 0.45 } as any,
  cTabHov: { borderColor: theme.color.yellow } as any,
  cTabRank: { fontFamily: theme.font.display, fontSize: 14, color: "#777" } as any,
  cTabRankOn: { color: theme.color.crimson } as any,
  cTabName: { flex: 1, fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1, color: "#aaa", fontWeight: "700" } as any,
  cTabNameOn: { color: theme.color.black } as any,
  cTabDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#333" } as any,
  cTabDotOn: { backgroundColor: theme.color.crimson } as any,
  cTabDotLocked: { backgroundColor: "#222" } as any,

  cCard: {
    flex: 1,
    maxWidth: 840,
    backgroundColor: theme.color.paper,
    borderWidth: 3,
    borderColor: theme.color.black,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 26,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 0,
    shadowOffset: { width: 8, height: 8 },
  } as any,
  cHole: { position: "absolute", top: 14, left: "50%", marginLeft: -14, width: 28, height: 14, borderRadius: 7, backgroundColor: "#0a0a0a", borderWidth: 2, borderColor: "#2a2a2a" } as any,
  cHolo: {
    position: "absolute",
    top: -8,
    right: -14,
    width: 90,
    height: 110,
    opacity: 0.14,
    transform: [{ rotate: "18deg" }, { skewX: "-12deg" }],
    ...(web ? ({ backgroundImage: "linear-gradient(135deg, transparent 30%, rgba(252,238,33,0.9) 30% 45%, transparent 45%), linear-gradient(45deg, #E60012 25%, transparent 25%)", backgroundSize: "18px 18px" } as any) : {}),
  } as any,
  cCorner: { position: "absolute", bottom: 0, right: 0, width: 56, height: 56, backgroundColor: theme.color.crimson, ...(web ? { clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)" } as any : {}) } as any,
  cCardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 4, borderBottomColor: theme.color.black, paddingBottom: 12, marginTop: 8 } as any,
  cCardHeadLeft: { gap: 2 } as any,
  cCardKicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "#777", fontWeight: "800" } as any,
  cCardName: { fontFamily: theme.font.display, fontSize: 26, color: theme.color.black, letterSpacing: 1 } as any,
  cCardSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: "#555", fontWeight: "700" } as any,
  cCardStamp: { borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate: "4deg" }] } as any,
  cCardStampLocked: { borderColor: "#999" } as any,
  cCardStampTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  cCardStampTxtLocked: { color: "#999" } as any,
  cCardBody: { flexDirection: "row", gap: 18, marginTop: 16 } as any,
  cPhotoWrap: { width: 148, alignItems: "center", gap: 8 } as any,
  cPhoto: { width: 148, height: 148, backgroundColor: "#0e0e0e", borderWidth: 3, borderColor: theme.color.black, alignItems: "center", justifyContent: "center", overflow: "hidden" } as any,
  cPhotoImg: { width: "100%", height: "100%" } as any,
  cPhotoQ: { fontFamily: theme.font.display, fontSize: 48, color: "#333" } as any,
  cPhotoMeta: { flexDirection: "row", gap: 8, backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: "-6deg" }] } as any,
  cPhotoMetaLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.yellow, fontWeight: "800" } as any,
  cPhotoMetaVal: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1.5, color: theme.color.paper, fontWeight: "800" } as any,
  cFields: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10, alignContent: "flex-start" } as any,
  cField: { width: "31%", backgroundColor: "#f5f0e0", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10 } as any,
  cFieldLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  cFieldVal: { fontFamily: theme.font.body, fontSize: 12, color: "#111", fontWeight: "800", marginTop: 3 } as any,
  cFieldRedact: { height: 12, backgroundColor: "#111", borderRadius: 2, marginTop: 4 } as any,
  cRightCol: { width: 180, gap: 10 } as any,
  cQuoteSm: { backgroundColor: "#fff", borderLeftWidth: 3, borderLeftColor: theme.color.crimson, paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", gap: 6 } as any,
  cQuoteSmMark: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.crimson, lineHeight: 18 } as any,
  cQuoteSmTxt: { flex: 1, fontFamily: theme.font.body, fontSize: 10, lineHeight: 14 as any, color: "#222", fontStyle: "italic" } as any,
  cQuoteSmRedact: { flex: 1, height: 12, backgroundColor: "#111", borderRadius: 2 } as any,
  cAssociatesSm: { backgroundColor: "#f5f0e0", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10 } as any,
  cAssociatesSmLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  cAssocSmRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" } as any,
  cAssocSmChip: { backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: "-6deg" }] } as any,
  cAssocSmTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.paper, fontWeight: "700" } as any,
  cThreatSm: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10 } as any,
  cThreatSmLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  cThreatSmBar: { height: 8, backgroundColor: "#e8e0c8", borderWidth: 1, borderColor: "#111", marginTop: 6 } as any,
  cThreatSmFill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  cCardFoot: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, borderTopWidth: 2, borderStyle: "dashed", borderColor: "#c9b896", paddingTop: 10 } as any,
  cCardFootLabel: { fontFamily: theme.font.body, fontSize: 7, letterSpacing: 2, color: "#8a7f6a", fontWeight: "800" } as any,
  cCardFootVal: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "#111", fontWeight: "800" } as any,
  cBarcodeSm: { flexDirection: "row", gap: 1.5, marginLeft: "auto", height: 18, alignItems: "flex-end" } as any,
  cBarSm: { backgroundColor: "#111", height: 18 } as any,

  /* ===== SAMPLE 3 — case board ===== */
  dStage: { flex: 1, paddingTop: 72, paddingBottom: 22, paddingHorizontal: "3%", zIndex: 2 } as any,
  dStrings: { ...StyleSheet.absoluteFillObject, zIndex: 0 } as any,
  dString: { position: "absolute", left: "-10%", right: "-10%", height: 2, backgroundColor: theme.color.crimson, opacity: 0.28 } as any,
  dHead: { alignItems: "center", marginBottom: 18 } as any,
  dTitle: { fontFamily: theme.font.display, fontSize: 48, color: theme.color.paper, letterSpacing: 4, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  dSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  dRow: { flex: 1, flexDirection: "row", gap: 20 } as any,
  dTabs: { width: 180, gap: 6 } as any,
  dTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 10,
    transform: [{ skewX: "-6deg" }],
  } as any,
  dTabOn: { backgroundColor: theme.color.paper, borderColor: theme.color.crimson } as any,
  dTabLocked: { opacity: 0.5 } as any,
  dTabHov: { borderColor: theme.color.yellow } as any,
  dTabNum: { fontFamily: theme.font.display, fontSize: 16, color: "#666" } as any,
  dTabNumOn: { color: theme.color.crimson } as any,
  dTabName: { flex: 1, fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1, color: "#aaa", fontWeight: "700" } as any,
  dTabNameOn: { color: theme.color.black } as any,
  dBoardCard: {
    flex: 1,
    maxWidth: 880,
    backgroundColor: "#f6f1e3",
    transform: [{ rotate: "-0.5deg" }],
    paddingVertical: 22,
    paddingHorizontal: 26,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 0,
    shadowOffset: { width: 8, height: 8 },
    overflow: "hidden",
  } as any,
  dBoardTape: { position: "absolute", top: -8, left: "38%", width: 100, height: 24, backgroundColor: "rgba(252,238,33,0.75)", transform: [{ rotate: "-2deg" }], borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(0,0,0,0.1)" } as any,
  dBoardClip: { position: "absolute", top: -10, right: 40, width: 24, height: 48, borderWidth: 4, borderTopColor: "transparent", borderLeftColor: "#9a9a9a", borderRightColor: "#9a9a9a", borderBottomColor: "#9a9a9a", borderRadius: 6, transform: [{ rotate: "6deg" }] } as any,
  dBoardWatermark: { position: "absolute", top: "34%", left: "-4%", right: "-4%", textAlign: "center", fontFamily: theme.font.display, fontSize: 84, letterSpacing: 12, color: theme.color.crimson, opacity: 0.06, transform: [{ rotate: "-14deg" }] } as any,
  dBoardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 3, borderBottomColor: theme.color.black, paddingBottom: 10 } as any,
  dBoardKicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "#777", fontWeight: "800" } as any,
  dBoardTitle: { fontFamily: theme.font.display, fontSize: 26, color: theme.color.black, marginTop: 2 } as any,
  dBoardSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1.5, color: "#555", fontWeight: "700", marginTop: 2 } as any,
  dBoardBody: { flexDirection: "row", gap: 18, marginTop: 16 } as any,
  dBoardPhoto: { width: 148, height: 148, backgroundColor: "#0e0e0e", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#d8d0ba", overflow: "hidden" } as any,
  dBoardPhotoImg: { width: "100%", height: "100%" } as any,
  dBoardPhotoQ: { fontFamily: theme.font.display, fontSize: 48, color: "#333" } as any,
  dBoardPhotoPin: { position: "absolute", top: -6, left: "50%", marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#7a000a" } as any,
  dBoardRight: { flex: 1, gap: 12 } as any,
  dBoardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 } as any,
  dBoardField: { width: "47%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10 } as any,
  dBoardFieldLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  dBoardFieldVal: { fontFamily: theme.font.body, fontSize: 12, color: "#111", fontWeight: "800", marginTop: 3 } as any,
  dBoardFieldRedact: { height: 12, backgroundColor: "#111", borderRadius: 2, marginTop: 4 } as any,
  dBoardQuote: { backgroundColor: "#fff", borderLeftWidth: 3, borderLeftColor: theme.color.crimson, paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", gap: 8 } as any,
  dBoardQuoteMark: { fontFamily: theme.font.display, fontSize: 20, color: theme.color.crimson, lineHeight: 20 } as any,
  dBoardQuoteTxt: { flex: 1, fontFamily: theme.font.body, fontSize: 11, lineHeight: 15 as any, color: "#222", fontStyle: "italic" } as any,
  dBoardQuoteRedact: { flex: 1, height: 12, backgroundColor: "#111", borderRadius: 2 } as any,
  dBoardLore: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 10, paddingHorizontal: 12 } as any,
  dBoardLoreLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  dBoardLoreTxt: { fontFamily: theme.font.body, fontSize: 11, lineHeight: 16 as any, color: "#222", marginTop: 6 } as any,
  dBoardLoreRedact: { height: 12, backgroundColor: "#111", borderRadius: 2 } as any,
  dBoardLoreRedactCol: { gap: 6, marginTop: 6 } as any,
  dBoardAssociates: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d8d0ba", paddingVertical: 8, paddingHorizontal: 10 } as any,
  dBoardAssocLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  dBoardAssocRow: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" } as any,
  dBoardAssocChip: { backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: "-6deg" }], flexDirection: "row", alignItems: "center", gap: 4 } as any,
  dBoardAssocTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: theme.color.paper, fontWeight: "700" } as any,
  dBoardStringDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.color.crimson, marginLeft: 6 } as any,
  dBoardFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, borderTopWidth: 2, borderStyle: "dashed", borderColor: "#c9b896", paddingTop: 8 } as any,
  dBoardFootLabel: { fontFamily: theme.font.body, fontSize: 7, letterSpacing: 2, color: "#8a7f6a", fontWeight: "800" } as any,
  dBoardFootVal: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "#111", fontWeight: "800" } as any,
  dBoardFootLine: { flex: 1, height: 1, backgroundColor: "#d8d0ba" } as any,
});
