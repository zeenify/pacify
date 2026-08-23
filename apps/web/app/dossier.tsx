/* DOSSIER — 13 SEATS SECRET FILES — 3 sample designs, switch with A/B/C (bottom-right).
   A: EVIDENCE BOARD — pinned folders + red string, detective wall
   B: FILE CABINET — folder tabs left, one big open document right
   C: WANTED POSTERS — all-out-attack slash, jagged black posters */
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

const TRICKS = ["VOID", "ORACLE", "REVERSAL", "WARD", "ECHO", "MIRROR", "SHACKLE", "GAZE", "FLOW", "RUST", "CROWN", "MASK", "ZERO"];
const TELLS = [
  "Plays it safe early. Slams the gas on round five. Talks when you hesitate.",
  "Counts your cards out loud. The counting stops when he is bluffing.",
  "Smiles before every big play. The bigger the smile, the worse it gets.",
  "Never speaks first. If she opens the round, you already lost.",
  "Fakes a yawn while holding gold. Watch the hands, not the face.",
  "Keeps a lucky coin. Flips it when the deck turns against him.",
  "Humming means confident. Silence means cornered — and dangerous.",
  "Apologizes before every cut. The apology is the tell.",
  "Stares at your chips, never your eyes. The stare is the steal.",
  "Plays with a broken fan. Repairs it only before a winning hand.",
  "Laughs at bad draws. The laugh is a loaded gun.",
  "Sits perfectly still for nine rounds. Round ten belongs to him.",
  "The Ace of the class. No one has seen the tell and kept their streak.",
];

const uriFor = (id: number) =>
  id === 2 ? "/students/3clubs.png" : id === 3 ? "/students/4clubs.png" : "/students/2clubs9x16.png";

export default function Dossier() {
  const [data, setData] = useState<{ students: StudentRow[]; clearedCount: number } | null>(null);
  const [sample, setSample] = useState<"A" | "B" | "C">("A");

  useEffect(() => {
    api("/campaign")
      .then((d: any) => setData(d))
      .catch(() => router.replace("/"));
  }, []);

  if (!data) {
    return (
      <View style={s.stage as any}>
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>
          PULLING THE FILES…
        </Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />

      {sample === "A" && <SampleA data={data} />}
      {sample === "B" && <SampleB data={data} />}
      {sample === "C" && <SampleC data={data} />}

      {/* sample switcher */}
      <View style={s.swWrap as any}>
        <Text style={s.swTag as any}>SAMPLE</Text>
        {(["A", "B", "C"] as const).map((k) => (
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

/* ================= A — EVIDENCE BOARD ================= */
function SampleA({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  return (
    <View style={s.aStage as any}>
      {/* red strings across the board */}
      <View style={s.aStrings as any} pointerEvents="none">
        {[
          { t: "18%", r: -14 },
          { t: "38%", r: 9 },
          { t: "57%", r: -7 },
          { t: "76%", r: 13 },
          { t: "30%", r: 4 },
          { t: "66%", r: -11 },
        ].map((L, i) => (
          <View key={i} style={[s.aString as any, { top: L.t, transform: [{ rotate: L.r + "deg" }] } as any]} />
        ))}
      </View>

      <View style={s.aHead as any}>
        <Text style={[s.aKicker as any, web && ({ animation: "heroIn 500ms 80ms both" } as any)]}>
          VERTEX INSTITUTE — CONFISCATED EVIDENCE
        </Text>
        <Text style={[s.aTitle as any, web && ({ animation: "heroIn 600ms 160ms both" } as any)]}>THE THIRTEEN FILES</Text>
        <Text style={[s.aSub as any, web && ({ animation: "heroIn 500ms 260ms both" } as any)]}>
          KNOW THEIR TELL BEFORE THEY KNOW YOURS
        </Text>
      </View>

      <View style={s.aBoard as any}>
        {data.students.map((st, i) => {
          const locked = st.id > nextId;
          const rot = ((i % 5) - 2) * 2.4;
          return (
            <Pressable
              key={st.id}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.aFolder as any,
                { transform: [{ rotate: rot + "deg" }] } as any,
                locked && (s.aFolderLocked as any),
                st.cleared && (s.aFolderCleared as any),
                hovered && !locked && (s.aFolderHov as any),
                web && ({ animation: `jokerIn 500ms ${100 + i * 45}ms both` } as any),
              ]}
            >
              {/* pin */}
              <View style={[s.aPin as any, st.cleared && (s.aPinCleared as any)]} />
              <Text style={s.aNum as any}>{String(st.id).padStart(2, "0")}</Text>
              <View style={s.aPhoto as any}>
                {locked ? (
                  <Text style={s.aPhotoQ as any}>?</Text>
                ) : (
                  <Image source={{ uri: uriFor(st.id) }} style={s.aPhotoImg as any} resizeMode="contain" />
                )}
                {!locked && <View style={s.aPhotoSlash as any} />}
              </View>
              <View style={s.aMeta as any}>
                <Text style={s.aTrick as any}>TRICK — {locked ? "████" : TRICKS[st.id - 1]}</Text>
                <Text style={s.aTell as any} numberOfLines={2}>
                  {locked ? "██████ ███ ████ ██████ ████" : TELLS[st.id - 1]}
                </Text>
              </View>
              <View style={[s.aStamp as any, st.cleared && (s.aStampCleared as any), locked && (s.aStampLocked as any)]}>
                <Text style={[s.aStampTxt as any, st.cleared && (s.aStampTxtCleared as any), locked && (s.aStampTxtLocked as any)]}>
                  {st.cleared ? "PACIFIED" : locked ? "REDACTED" : st.id === nextId ? "TARGET" : "CLASSIFIED"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ================= B — FILE CABINET ================= */
function SampleB({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  const firstOpen = data.students.find((st) => st.id <= nextId) ?? data.students[0];
  const [sel, setSel] = useState<number>(firstOpen.id);
  const cur = data.students.find((st) => st.id === sel)!;
  const locked = cur.id > nextId;

  return (
    <View style={s.bStage as any}>
      <View style={s.bHead as any}>
        <Text style={[s.bTitle as any, web && ({ animation: "heroIn 600ms 80ms both" } as any)]}>SECRET FILES</Text>
        <Text style={[s.bSub as any, web && ({ animation: "heroIn 500ms 200ms both" } as any)]}>
          13 SEATS — PULL A TAB TO OPEN A FILE
        </Text>
      </View>

      <View style={s.bRow as any}>
        {/* tabs */}
        <View style={s.bTabs as any}>
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
                  s.bTab as any,
                  on && (s.bTabOn as any),
                  lk && (s.bTabLocked as any),
                  hovered && !on && ({ transform: [{ translateX: 6 }] } as any),
                  web && ({ animation: `rowIn 400ms ${60 + i * 35}ms both` } as any),
                ]}
              >
                <Text style={[s.bTabNum as any, on && (s.bTabNumOn as any)]}>{String(st.id).padStart(2, "0")}</Text>
                <View style={s.bTabRight as any}>
                  <Text style={[s.bTabName as any, on && (s.bTabNameOn as any)]}>{lk ? "████████" : `SEAT ${String(st.id).padStart(2, "0")}`}</Text>
                  <Text style={[s.bTabSub as any, on && (s.bTabSubOn as any)]}>
                    {st.cleared ? "PACIFIED" : lk ? "SEALED" : st.id === nextId ? "TARGET" : "CLASSIFIED"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* open document */}
        <View key={sel} style={[s.bDoc as any, web && ({ animation: "p5-tabR 340ms cubic-bezier(0.16,1,0.3,1) both" } as any)]}>
          {/* paperclip */}
          <View style={s.bClip as any} pointerEvents="none" />
          {/* coffee ring */}
          <View style={s.bRing as any} pointerEvents="none" />

          <View style={s.bDocHead as any}>
            <View>
              <Text style={s.bDocKicker}>VERTEX INSTITUTE — STUDENT FILE</Text>
              <Text style={s.bDocTitle}>{locked ? "FILE ████████" : `SEAT ${String(cur.id).padStart(2, "0")} — “${rankOf(cur.id)}♣”`}</Text>
            </View>
            <View style={s.bStamp as any}>
              <Text style={s.bStampTxt as any}>{locked ? "SEALED" : "TOP SECRET"}</Text>
            </View>
          </View>

          <View style={s.bDocBody as any}>
            {/* photo */}
            <View style={s.bPhoto as any}>
              {locked ? (
                <Text style={s.bPhotoQ as any}>?</Text>
              ) : (
                <Image source={{ uri: uriFor(cur.id) }} style={s.bPhotoImg as any} resizeMode="contain" />
              )}
              <View style={s.bPhotoTag as any}>
                <Text style={s.bPhotoTagTxt as any}>{locked ? "NO PHOTO ON RECORD" : `TIER ${cur.tier} — SEAT ${String(cur.id).padStart(2, "0")}`}</Text>
              </View>
            </View>

            {/* data rows */}
            <View style={s.bData as any}>
              <View style={s.bDataRow as any}>
                <Text style={s.bDataLabel as any}>TRICK</Text>
                {locked ? <View style={s.bRedact as any} /> : <Text style={s.bDataVal as any}>{TRICKS[cur.id - 1]}-TYPE</Text>}
              </View>
              <View style={s.bDataRow as any}>
                <Text style={s.bDataLabel as any}>THREAT</Text>
                {locked ? (
                  <View style={s.bRedact as any} />
                ) : (
                  <View style={s.bThreat as any}>
                    <View style={[s.bThreatFill as any, { width: `${(cur.tier / 13) * 100}%` } as any]} />
                  </View>
                )}
              </View>
              <View style={s.bDataRow as any}>
                <Text style={s.bDataLabel as any}>RECORD</Text>
                {locked ? (
                  <View style={s.bRedact as any} />
                ) : (
                  <Text style={s.bDataVal as any}>
                    {cur.wins}W — {cur.losses}L · BEST {cur.bestScore}
                  </Text>
                )}
              </View>
              <View style={s.bDataRow as any}>
                <Text style={s.bDataLabel as any}>TELL</Text>
                {locked ? <View style={[s.bRedact as any, { height: 34 } as any]} /> : <Text style={s.bTellVal as any}>{TELLS[cur.id - 1]}</Text>}
              </View>
            </View>
          </View>

          <Text style={s.bFoot as any}>HANDLE WITH CARE — PROPERTY OF THE STUDENT COUNCIL</Text>
        </View>
      </View>
    </View>
  );
}

/* ================= C — WANTED POSTERS ================= */
function SampleC({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  return (
    <View style={s.cStage as any}>
      {/* diagonal slash band */}
      <View style={s.cSlash as any} pointerEvents="none" />
      <View style={s.cHalftone as any} pointerEvents="none" />

      <View style={s.cHead as any}>
        <Text style={[s.cKicker as any, web && ({ animation: "heroIn 500ms 80ms both" } as any)]}>
          ALL POINTS BULLETIN — VERTEX INSTITUTE
        </Text>
        <Text style={[s.cTitle as any, web && ({ animation: "heroIn 600ms 160ms both" } as any)]}>WANTED</Text>
        <Text style={[s.cSub as any, web && ({ animation: "heroIn 500ms 260ms both" } as any)]}>THE THIRTEEN — ALIVE AND UNPACIFIED</Text>
      </View>

      <View style={s.cGrid as any}>
        {data.students.map((st, i) => {
          const locked = st.id > nextId;
          return (
            <Pressable
              key={st.id}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.cPoster as any,
                locked && (s.cPosterLocked as any),
                st.cleared && (s.cPosterCleared as any),
                st.id === nextId && !st.cleared && (s.cPosterNext as any),
                hovered && (s.cPosterHov as any),
                web && ({ animation: `jokerIn 480ms ${100 + i * 40}ms both` } as any),
              ]}
            >
              <Text style={s.cWanted as any}>WANTED</Text>
              <View style={s.cNumBox as any}>
                <Text style={s.cNum as any}>{rankOf(st.id)}</Text>
                <Text style={s.cSuit as any}>♣</Text>
              </View>
              {locked ? (
                <View style={s.cRedactCol as any}>
                  <View style={s.cRedact as any} />
                  <View style={[s.cRedact as any, { width: "55%" } as any]} />
                </View>
              ) : (
                <Image source={{ uri: uriFor(st.id) }} style={s.cImg as any} resizeMode="contain" />
              )}
              <View style={[s.cStamp as any, st.cleared && (s.cStampCleared as any), locked && (s.cStampLocked as any)]}>
                <Text style={[s.cStampTxt as any, st.cleared && (s.cStampTxtCleared as any), locked && (s.cStampTxtLocked as any)]}>
                  {st.cleared ? "PACIFIED" : locked ? "SEALED" : st.id === nextId ? "TARGET" : "AT LARGE"}
                </Text>
              </View>
            </Pressable>
          );
        })}
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

  /* switcher */
  swWrap: { position: "absolute", bottom: 18, right: 18, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 99 } as any,
  swTag: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.4)", fontWeight: "800" } as any,
  swBtn: { width: 44, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#161616", borderWidth: 2, borderColor: "#333", transform: [{ skewX: "-10deg" }] } as any,
  swBtnOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  swBtnHov: { borderColor: theme.color.yellow } as any,
  swTxt: { fontFamily: theme.font.display, fontSize: 18, color: "#777" } as any,
  swTxtOn: { color: theme.color.paper } as any,

  /* ===== A — evidence board ===== */
  aStage: { flex: 1, paddingTop: 78, paddingBottom: 26, zIndex: 2 } as any,
  aStrings: { ...StyleSheet.absoluteFillObject, zIndex: 0 } as any,
  aString: { position: "absolute", left: "-12%", right: "-12%", height: 3, backgroundColor: theme.color.crimson, opacity: 0.32 } as any,
  aHead: { alignItems: "center", marginBottom: 20, zIndex: 2 } as any,
  aKicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 5, color: theme.color.yellow, fontWeight: "800" } as any,
  aTitle: { fontFamily: theme.font.display, fontSize: 54, color: theme.color.paper, letterSpacing: 4, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}`, marginTop: 4 } as any,
  aSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  aBoard: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", gap: 16, paddingHorizontal: "3%", zIndex: 2 } as any,
  aFolder: {
    width: 148,
    backgroundColor: "#f3edda",
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 0,
    shadowOffset: { width: 5, height: 6 },
    ...(web ? ({ transition: "transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms" } as any) : {}),
  } as any,
  aFolderHov: { transform: [{ rotate: "0deg" }, { translateY: -10 }, { scale: 1.05 }], shadowOpacity: 0.8, shadowOffset: { width: 8, height: 12 }, zIndex: 5 } as any,
  aFolderLocked: { backgroundColor: "#cfc9ba" } as any,
  aFolderCleared: { backgroundColor: "#f7f0cf" } as any,
  aPin: { position: "absolute", top: -8, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#7a000a", zIndex: 3 } as any,
  aPinCleared: { backgroundColor: theme.color.yellow, borderColor: "#8a7a00" } as any,
  aNum: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.crimson, letterSpacing: 1 } as any,
  aPhoto: { width: 92, height: 118, backgroundColor: "#101010", marginTop: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2, borderColor: "#d8d0ba" } as any,
  aPhotoImg: { width: "100%", height: "100%", opacity: 0.85 } as any,
  aPhotoSlash: { position: "absolute", left: "-20%", right: "-20%", top: "50%", height: 3, backgroundColor: theme.color.crimson, transform: [{ rotate: "-24deg" }] } as any,
  aPhotoQ: { fontFamily: theme.font.display, fontSize: 44, color: "#3a3a3a" } as any,
  aMeta: { alignSelf: "stretch", marginTop: 8 } as any,
  aTrick: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "800" } as any,
  aTell: { fontFamily: theme.font.body, fontSize: 8.5, lineHeight: 11 as any, color: "#444", marginTop: 3 } as any,
  aStamp: { marginTop: 8, borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 7, paddingVertical: 2, transform: [{ rotate: "-4deg" }] } as any,
  aStampTxt: { fontFamily: theme.font.body, fontSize: 8.5, letterSpacing: 2, color: theme.color.crimson, fontWeight: "900" } as any,
  aStampCleared: { borderColor: "#7a6a00", backgroundColor: theme.color.yellow } as any,
  aStampTxtCleared: { color: theme.color.black } as any,
  aStampLocked: { borderColor: "#8a8a8a" } as any,
  aStampTxtLocked: { color: "#8a8a8a" } as any,

  /* ===== B — file cabinet ===== */
  bStage: { flex: 1, paddingTop: 84, paddingBottom: 26, paddingHorizontal: "3.5%", zIndex: 2 } as any,
  bHead: { marginBottom: 18 } as any,
  bTitle: { fontFamily: theme.font.display, fontSize: 52, color: theme.color.paper, letterSpacing: 4, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  bSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  bRow: { flex: 1, flexDirection: "row", gap: 26 } as any,
  bTabs: { width: 250, gap: 7 } as any,
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
    paddingVertical: 9,
    paddingHorizontal: 14,
    transform: [{ skewX: "-6deg" }],
    ...(web ? ({ transition: "transform 160ms ease, background-color 160ms" } as any) : {}),
  } as any,
  bTabOn: { backgroundColor: theme.color.paper, borderLeftColor: theme.color.crimson, borderColor: theme.color.paper, transform: [{ skewX: "-6deg" }, { translateX: 12 }] } as any,
  bTabLocked: { opacity: 0.55 } as any,
  bTabNum: { fontFamily: theme.font.display, fontSize: 20, color: theme.color.crimson, width: 36 } as any,
  bTabNumOn: { color: theme.color.crimson } as any,
  bTabRight: { flex: 1 } as any,
  bTabName: { fontFamily: theme.font.display, fontSize: 14, color: "#9a9a9a", letterSpacing: 1 } as any,
  bTabNameOn: { color: theme.color.black } as any,
  bTabSub: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "#666", fontWeight: "800", marginTop: 1 } as any,
  bTabSubOn: { color: theme.color.crimson } as any,
  bDoc: {
    flex: 1,
    maxWidth: 860,
    backgroundColor: "#f6f1e3",
    transform: [{ rotate: "-0.8deg" }, { skewX: "-1deg" }],
    paddingVertical: 26,
    paddingHorizontal: 30,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 0,
    shadowOffset: { width: 8, height: 10 },
  } as any,
  bClip: {
    position: "absolute",
    top: -14,
    right: 60,
    width: 26,
    height: 52,
    borderWidth: 5,
    borderTopColor: "transparent",
    borderLeftColor: "#9a9a9a",
    borderRightColor: "#9a9a9a",
    borderBottomColor: "#9a9a9a",
    borderRadius: 8,
    transform: [{ rotate: "8deg" }],
    zIndex: 4,
  } as any,
  bRing: { position: "absolute", bottom: 18, right: 26, width: 74, height: 74, borderRadius: 37, borderWidth: 5, borderColor: "rgba(139,90,43,0.22)" } as any,
  bDocHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", borderBottomWidth: 3, borderBottomColor: theme.color.black, paddingBottom: 12 } as any,
  bDocKicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "#777", fontWeight: "800" } as any,
  bDocTitle: { fontFamily: theme.font.display, fontSize: 30, color: theme.color.black, marginTop: 4, letterSpacing: 1 } as any,
  bStamp: { borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "6deg" }] } as any,
  bStampTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: theme.color.crimson, fontWeight: "900" } as any,
  bDocBody: { flexDirection: "row", gap: 24, marginTop: 20 } as any,
  bPhoto: { width: 170, height: 250, backgroundColor: "#101010", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#d8d0ba", overflow: "hidden" } as any,
  bPhotoImg: { width: "100%", height: "100%", opacity: 0.9 } as any,
  bPhotoQ: { fontFamily: theme.font.display, fontSize: 72, color: "#3a3a3a" } as any,
  bPhotoTag: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.78)", paddingVertical: 5, alignItems: "center" } as any,
  bPhotoTagTxt: { fontFamily: theme.font.body, fontSize: 8.5, letterSpacing: 2, color: theme.color.yellow, fontWeight: "800" } as any,
  bData: { flex: 1, gap: 14, justifyContent: "center" } as any,
  bDataRow: { minHeight: 34, justifyContent: "center" } as any,
  bDataLabel: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.crimson, fontWeight: "900", marginBottom: 4 } as any,
  bDataVal: { fontFamily: theme.font.body, fontSize: 15, color: "#222", fontWeight: "800", letterSpacing: 1 } as any,
  bTellVal: { fontFamily: theme.font.body, fontSize: 12.5, lineHeight: 17 as any, color: "#333" } as any,
  bRedact: { height: 16, width: 180, backgroundColor: "#111", borderRadius: 2 } as any,
  bThreat: { height: 14, width: "80%", backgroundColor: "#e2dbc8", borderWidth: 2, borderColor: theme.color.black } as any,
  bThreatFill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  bFoot: { marginTop: 18, fontFamily: theme.font.body, fontSize: 9, letterSpacing: 3, color: "#999", fontWeight: "800" } as any,

  /* ===== C — wanted posters ===== */
  cStage: { flex: 1, paddingTop: 78, paddingBottom: 26, zIndex: 2 } as any,
  cSlash: { position: "absolute", top: "30%", left: "-20%", right: "-20%", height: 190, backgroundColor: theme.color.crimson, opacity: 0.13, transform: [{ rotate: "-12deg" }] } as any,
  cHalftone: { position: "absolute", top: "-4%", right: "-4%", width: 380, height: 300, opacity: 0.12, transform: [{ rotate: "10deg" }], ...(web ? { backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)", backgroundSize: "15px 15px" } as any : {}) } as any,
  cHead: { alignItems: "center", marginBottom: 20 } as any,
  cKicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 5, color: theme.color.yellow, fontWeight: "800" } as any,
  cTitle: { fontFamily: theme.font.display, fontSize: 64, color: theme.color.paper, letterSpacing: 8, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.crimson}`, marginTop: 2 } as any,
  cSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  cGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", gap: 14, paddingHorizontal: "3%" } as any,
  cPoster: {
    width: 168,
    height: 232,
    backgroundColor: "#101010",
    borderWidth: 3,
    borderColor: "#e8e2d2",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 7 },
    ...(web
      ? ({
          clipPath: "polygon(0% 2%, 4% 0%, 96% 1%, 100% 3%, 99% 97%, 95% 100%, 5% 99%, 0% 96%)",
          transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms, box-shadow 200ms",
        } as any)
      : {}),
  } as any,
  cPosterHov: { transform: [{ rotate: "0deg" }, { scale: 1.05 }, { translateY: -8 }], borderColor: theme.color.crimson, zIndex: 5 } as any,
  cPosterLocked: { opacity: 0.42 } as any,
  cPosterCleared: { borderColor: theme.color.yellow } as any,
  cPosterNext: { borderColor: theme.color.crimson } as any,
  cWanted: { fontFamily: theme.font.display, fontSize: 15, letterSpacing: 6, color: "#cfc9b8" } as any,
  cNumBox: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 } as any,
  cNum: { fontFamily: theme.font.display, fontSize: 58, lineHeight: 62, color: theme.color.paper } as any,
  cSuit: { fontFamily: theme.font.display, fontSize: 30, color: theme.color.crimson } as any,
  cImg: { width: 96, height: 92, marginTop: 2, opacity: 0.9 } as any,
  cRedactCol: { width: "80%", gap: 6, marginTop: 30 } as any,
  cRedact: { height: 14, backgroundColor: "#2c2c2c" } as any,
  cStamp: { marginTop: "auto", borderWidth: 2, borderColor: "#8a8a8a", paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "-4deg" }] } as any,
  cStampTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "#9a9a9a", fontWeight: "900" } as any,
  cStampCleared: { borderColor: theme.color.black, backgroundColor: theme.color.yellow } as any,
  cStampTxtCleared: { color: theme.color.black } as any,
  cStampLocked: { borderColor: "#555" } as any,
  cStampTxtLocked: { color: "#777" } as any,
});
