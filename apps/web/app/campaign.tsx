/* CAMPAIGN — choose your target among the thirteen seats of Vertex Institute.
   Placeholder roster (SEAT_01…13) until students are authored one by one.
   Progress comes from the DB; fetched fresh on open. 3 samples. */
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { api } from "../lib/api";
import { playHover } from "../lib/sfx";
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

export default function Campaign() {
  const [sample, setSample] = useState<any>("a");
  const [data, setData] = useState<{ students: StudentRow[]; clearedCount: number } | null>(null);

  useEffect(() => {
    api("/campaign")
      .then((d: any) => setData(d))
      .catch(() => router.replace("/"));
  }, []);

  if (!data) {
    return (
      <View style={s.stage as any}>
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>PLOTTING THE ROUTE…</Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />
      <View style={s.picker as any}>
        {["a", "b", "c"].map((k) => (
          <Pressable key={k} onPress={() => setSample(k)} style={[s.pickBtn as any, sample === k && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{k.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {sample === "a" && <SampleA data={data} />}
      {sample === "b" && <SampleB data={data} />}
      {sample === "c" && <SampleC data={data} />}
    </View>
  );
}

/* ============ A — TARGET LIST: P5 one-point-perspective select ============ */
function SampleA({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  return (
    <View style={s.aWrap as any}>
      {/* left rail */}
      <View style={s.aLeft as any}>
        {["C", "A", "M", "P", "A", "I", "G", "N"].map((ch, i) => (
          <Text key={i} style={[s.aLetter as any, i % 3 === 0 && (s.aLetterC as any), i % 3 === 2 && (s.aLetterY as any), web && ({ animation: `p5-logoLetter 520ms ${i * 55}ms both` } as any)]}>
            {ch}
          </Text>
        ))}
        <View style={[s.aProgCard as any, web && ({ animation: "jokerIn 450ms 500ms both" } as any)]}>
          <Text style={s.aProgNum as any}>{data.clearedCount}/13</Text>
          <Text style={s.aProgLbl as any}>STUDENTS PACIFIED</Text>
          <View style={s.aBarTrack as any}>
            <View style={[s.aBarFill as any, { width: `${(data.clearedCount / 13) * 100}%` } as any]} />
          </View>
        </View>
      </View>

      {/* target rows */}
      <ScrollView style={s.aList as any} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          const locked = st.id > nextId;
          return (
            <Pressable
              key={st.id}
              onHoverIn={!locked ? playHover : undefined}
              onPress={!locked ? () => router.push({ pathname: "/match", params: { studentId: String(st.id) } }) : undefined}
              style={({ hovered }) => [
                s.aRow as any,
                isNext && (s.aRowNext as any),
                locked && (s.aRowLocked as any),
                hovered && !locked && (s.aRowHov as any),
                web && ({ animation: `${isNext ? "p5-kingIn" : "p5-rowSlide"} ${isNext ? 650 : 380}ms ${300 + i * 45}ms both` } as any),
              ]}
            >
              {({ hovered }) => (
                <>
                  <View style={[s.aSeatBox as any, isNext && (s.aSeatBoxNext as any)]}>
                    <Text style={s.aSeatTxt as any}>{String(st.id).padStart(2, "0")}</Text>
                  </View>
                  <View style={{ flex: 1 } as any}>
                    <Text style={[s.aName as any, locked && { color: "rgba(255,255,255,0.35)" } as any]}>{st.seat}</Text>
                    <Text style={s.aTitle as any}>{isNext ? "NEXT TARGET — STRIKE FIRST" : st.title}</Text>
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 4 } as any}>
                      {Array.from({ length: 13 }).map((_, p) => (
                        <View key={p} style={[s.pip as any, p < st.tier ? (locked ? s.pipDim : s.pipOn) : s.pipOff] as any} />
                      ))}
                    </View>
                  </View>
                  {st.cleared ? (
                    <View style={s.stampCleared as any}><Text style={s.stampClearedTxt as any}>PACIFIED</Text></View>
                  ) : isNext ? (
                    <View style={s.stampNext as any}><Text style={s.stampNextTxt as any}>▶ TARGET</Text></View>
                  ) : (
                    <View style={s.stampLocked as any}><Text style={s.stampLockedTxt as any}>{locked ? "LOCKED" : `${st.attempts} TRIES`}</Text></View>
                  )}
                  {hovered && !locked && web ? <View style={s.rowSweep as any} pointerEvents="none" /> : null}
                </>
              )}
            </Pressable>
          );
        })}
        </ScrollView>
      </View>
  );
}

/* ============ B — DOSSIER GRID: case folders on a pinboard ============ */
function SampleB({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  return (
    <View style={s.bWrap as any}>
      {/* case header */}
      <View style={s.bHead as any}>
        <Text style={[s.bTitle as any, web && ({ animation: "heroIn 500ms 80ms both" } as any)]}>CASE FILES</Text>
        <View style={s.bHeadRule as any} />
        <Text style={s.bMeta as any}>VERTEX INSTITUTE — {data.clearedCount} OF 13 PACIFIED</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center", paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          const locked = st.id > nextId;
          return (
            <Pressable
              key={st.id}
              onHoverIn={!locked ? playHover : undefined}
              onPress={!locked ? () => router.push({ pathname: "/match", params: { studentId: String(st.id) } }) : undefined}
              style={({ hovered }) => [
                s.folder as any,
                locked && (s.folderLocked as any),
                hovered && !locked && (s.folderHov as any),
                web && ({ animation: `jokerIn 420ms ${150 + i * 40}ms both` } as any),
              ]}
            >
              {/* folder tab */}
              <View style={[s.fTab as any, st.cleared && (s.fTabCleared as any), isNext && (s.fTabNext as any)]}>
                <Text style={s.fTabTxt as any}>{String(st.id).padStart(2, "0")}</Text>
              </View>
              {/* photo box */}
              <View style={[s.fPhoto as any, locked && { opacity: 0.35 } as any]}>
                <Text style={s.fGlyph as any}>{locked ? "✕" : "?"}</Text>
              </View>
              <Text style={s.fName as any} numberOfLines={1}>{st.seat}</Text>
              <Text style={s.fSub as any}>{st.cleared ? `${st.wins}W · ${st.attempts} TRIES` : isNext ? "NEXT TARGET" : locked ? "CLASSIFIED" : "UNTOUCHED"}</Text>
              {st.cleared && (
                <View style={s.fStamp as any} pointerEvents="none">
                  <Text style={s.fStampTxt as any}>PACIFIED</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ============ C — GAUNTLET PATH: route ladder down the screen ============ */
function SampleC({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const nextId = data.clearedCount + 1;
  return (
    <View style={s.cWrap as any}>
      {/* header */}
      <View style={s.cHead as any}>
        <Text style={[s.cTitle as any, web && ({ animation: "heroIn 500ms 80ms both" } as any)]}>THE GAUNTLET</Text>
        <Text style={s.cMeta as any}>{data.clearedCount}/13 PACIFIED — FOLLOW THE LINE DOWN</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          const locked = st.id > nextId;
          const passed = st.cleared;
          const leftSide = i % 2 === 0;
          return (
            <View key={st.id} style={s.cLeg as any}>
              {/* node column */}
              <View style={s.cNodeCol as any}>
                {i > 0 && <View style={[s.cSegment as any, passed || isNext ? (s.cSegOn as any) : null] as any} />}
                <View
                  style={[
                    s.cNode as any,
                    passed && (s.cNodeOn as any),
                    isNext && (s.cNodeNext as any),
                    locked && (s.cNodeLocked as any),
                    web && ({ animation: `${isNext ? "p5-kingIn 600ms 400ms" : `jokerIn 400ms ${i * 55}ms`} both` } as any),
                  ]}
                >
                  <Text style={[s.cNodeTxt as any, (passed || isNext) && { color: theme.color.black } as any]}>{passed ? "✦" : String(st.id).padStart(2, "0")}</Text>
                  {isNext && web && <View style={s.cPulseRing as any} pointerEvents="none" />}
                </View>
                {i < data.students.length - 1 && <View style={[s.cSegment as any, passed ? (s.cSegOn as any) : null] as any} />}
              </View>

              {/* side card */}
              <Pressable
                onHoverIn={!locked ? playHover : undefined}
                onPress={!locked ? () => router.push({ pathname: "/match", params: { studentId: String(st.id) } }) : undefined}
                style={({ hovered }) => [
                  s.cCard as any,
                  !leftSide && (s.cCardRight as any),
                  isNext && (s.cCardNext as any),
                  locked && (s.cCardLocked as any),
                  hovered && !locked && (s.cCardHov as any),
                  web && ({ animation: `p5-rowSlide 360ms ${200 + i * 50}ms both` } as any),
                ]}
              >
                <Text style={s.cCardSeat as any}>{st.seat}</Text>
                <Text style={s.cCardSub as any}>{st.cleared ? `PACIFIED · ${st.wins}W/${st.losses}L` : isNext ? "▶ NEXT TARGET" : locked ? "LOCKED" : "WAITING"}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
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
  loadingTxt: { fontFamily: theme.font.display, fontSize: 32, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,

  picker: { position: "absolute", top: 20, right: 20, zIndex: 99, flexDirection: "row", gap: 6 } as any,
  pickBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(0,0,0,0.55)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.paper } as any,

  /* A */
  aWrap: { flex: 1, flexDirection: "row", paddingHorizontal: "4%", paddingTop: 92, paddingBottom: 30, gap: 36, zIndex: 2 } as any,
  aLeft: { width: 118 } as any,
  aLetter: { fontFamily: theme.font.display, fontSize: 62, lineHeight: 66, color: theme.color.paper, textShadow: `3px 3px 0 ${theme.color.crimson}`, textAlign: "center" } as any,
  aLetterC: { color: theme.color.crimson, textShadow: `3px 3px 0 ${theme.color.paper}` } as any,
  aLetterY: { color: theme.color.yellow, textShadow: `3px 3px 0 ${theme.color.black}` } as any,
  aProgCard: { marginTop: 20, backgroundColor: "#141414", borderLeftWidth: 7, borderLeftColor: theme.color.crimson, borderWidth: 1, borderColor: "#2b2b2b", paddingVertical: 14, paddingHorizontal: 12, transform: [{ skewX: "-4deg" }] } as any,
  aProgNum: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.paper } as any,
  aProgLbl: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 2 } as any,
  aBarTrack: { height: 10, backgroundColor: "#000", borderWidth: 1, borderColor: "#333", marginTop: 10 } as any,
  aBarFill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  aList: { flex: 1, maxWidth: 860 } as any,
  aRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2b2b2b",
    borderLeftWidth: 8,
    borderLeftColor: "#333",
    paddingVertical: 13,
    paddingHorizontal: 16,
    transform: [{ skewX: "-3deg" }],
  } as any,
  aRowNext: { borderLeftColor: theme.color.crimson, backgroundColor: "#1a0d0d" } as any,
  aRowLocked: { opacity: 0.55 } as any,
  aRowHov: { transform: [{ skewX: "-3deg" }, { translateX: 9 }], borderColor: theme.color.paper } as any,
  aSeatBox: { width: 56, height: 56, alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.crimson, transform: [{ skewX: "6deg" }] } as any,
  aSeatBoxNext: { backgroundColor: theme.color.crimson } as any,
  aSeatTxt: { fontFamily: theme.font.display, fontSize: 22, color: theme.color.paper } as any,
  aName: { fontFamily: theme.font.body, fontSize: 19, fontWeight: "900", color: theme.color.paper, letterSpacing: 2 } as any,
  aTitle: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.45)", marginTop: 3 } as any,
  pip: { width: 7, height: 14, transform: [{ skewX: "-14deg" }] } as any,
  pipOn: { backgroundColor: theme.color.yellow } as any,
  pipDim: { backgroundColor: "#3a3a3a" } as any,
  pipOff: { backgroundColor: "#1c1c1c" } as any,
  stampCleared: { backgroundColor: theme.color.yellow, borderWidth: 2, borderColor: theme.color.black, paddingHorizontal: 9, paddingVertical: 4, transform: [{ rotate: "-5deg" }] } as any,
  stampClearedTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, fontWeight: "900", color: theme.color.black } as any,
  stampNext: { backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.paper, paddingHorizontal: 9, paddingVertical: 4, transform: [{ rotate: "3deg" }] } as any,
  stampNextTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, fontWeight: "900", color: theme.color.paper } as any,
  stampLocked: { borderWidth: 2, borderColor: "#3a3a3a", paddingHorizontal: 9, paddingVertical: 4 } as any,
  stampLockedTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, fontWeight: "800", color: "#666" } as any,
  rowSweep: { position: "absolute", bottom: 0, left: "4%", right: "4%", height: 5, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }], animation: "p5-sweep 320ms cubic-bezier(0.16,1,0.3,1) both" } as any,

  /* B */
  bWrap: { flex: 1, paddingHorizontal: "4%", paddingTop: 92, paddingBottom: 24, zIndex: 2 } as any,
  bHead: { marginBottom: 18 } as any,
  bTitle: { fontFamily: theme.font.display, fontSize: 46, color: theme.color.paper, transform: [{ skewX: "-8deg" }], textShadow: `5px 5px 0 ${theme.color.crimson}` } as any,
  bHeadRule: { width: "100%", maxWidth: 520, height: 5, backgroundColor: theme.color.crimson, marginTop: 6, transform: [{ skewX: "-20deg" }] } as any,
  bMeta: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 8 } as any,
  folder: {
    width: 218,
    backgroundColor: "#e8e0cf",
    borderWidth: 2,
    borderColor: "#c9bfa8",
    paddingVertical: 14,
    paddingHorizontal: 14,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 6 },
  } as any,
  folderLocked: { backgroundColor: "#23201a", borderColor: "#333" } as any,
  folderHov: { transform: [{ translateY: -8 }, { rotate: "-1deg" }], shadowOffset: { width: 9, height: 9 } } as any,
  fTab: {
    position: "absolute",
    top: -22,
    left: 12,
    backgroundColor: "#d9cfba",
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: "#c9bfa8",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 12,
  } as any,
  fTabCleared: { backgroundColor: theme.color.yellow, borderColor: theme.color.black } as any,
  fTabNext: { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any,
  fTabTxt: { fontFamily: theme.font.body, fontSize: 12.5, fontWeight: "900", color: theme.color.black, letterSpacing: 1 } as any,
  fPhoto: {
    height: 96,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#b3a88f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  } as any,
  fGlyph: { fontFamily: theme.font.display, fontSize: 40, color: theme.color.crimson } as any,
  fName: { fontFamily: theme.font.display, fontSize: 21, color: theme.color.black, letterSpacing: 1 } as any,
  fSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, color: "#6b6252", fontWeight: "800", marginTop: 3 } as any,
  fStamp: {
    position: "absolute",
    right: 8,
    top: 34,
    borderWidth: 3,
    borderColor: theme.color.crimson,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: "-14deg" }],
    backgroundColor: "rgba(230,0,18,0.08)",
  } as any,
  fStampTxt: { fontFamily: theme.font.body, fontSize: 12, fontWeight: "900", letterSpacing: 2, color: theme.color.crimson } as any,

  /* C */
  cWrap: { flex: 1, paddingHorizontal: "4%", paddingTop: 92, paddingBottom: 20, zIndex: 2 } as any,
  cHead: { marginBottom: 16 } as any,
  cTitle: { fontFamily: theme.font.display, fontSize: 46, color: theme.color.paper, transform: [{ skewX: "-8deg" }], textShadow: `5px 5px 0 ${theme.color.crimson}` } as any,
  cMeta: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 8 } as any,
  cLeg: { flexDirection: "row", alignItems: "stretch" } as any,
  cNodeCol: { width: 84, alignItems: "center" } as any,
  cSegment: { width: 5, flex: 1, minHeight: 26, backgroundColor: "#2b2b2b", transform: [{ skewX: "-6deg" }] } as any,
  cSegOn: { backgroundColor: theme.color.crimson } as any,
  cNode: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: "#3a3a3a",
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
  } as any,
  cNodeOn: { backgroundColor: theme.color.yellow, borderColor: theme.color.black } as any,
  cNodeNext: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  cNodeLocked: { opacity: 0.5 } as any,
  cNodeTxt: { fontFamily: theme.font.body, fontSize: 15, fontWeight: "900", color: "rgba(255,255,255,0.5)" } as any,
  cPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: theme.color.crimson,
    animation: "p5-blinkHard 1s steps(1) infinite",
  } as any,
  cCard: {
    flex: 1,
    maxWidth: 420,
    marginVertical: 10,
    backgroundColor: "#141414",
    borderLeftWidth: 7,
    borderLeftColor: theme.color.crimson,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2b2b2b",
    paddingVertical: 14,
    paddingHorizontal: 18,
    transform: [{ skewX: "-3deg" }, { translateX: 26 }],
  } as any,
  cCardRight: { transform: [{ skewX: "-3deg" }, { translateX: -26 }], borderLeftWidth: 1, borderRightWidth: 7, borderRightColor: theme.color.crimson, borderLeftColor: "#2b2b2b" } as any,
  cCardNext: { backgroundColor: "#1a0d0d", borderColor: theme.color.paper } as any,
  cCardLocked: { opacity: 0.5 } as any,
  cCardHov: { transform: [{ skewX: "-3deg" }, { translateX: 34 }], borderColor: theme.color.paper } as any,
  cCardSeat: { fontFamily: theme.font.body, fontSize: 17, fontWeight: "900", color: theme.color.paper, letterSpacing: 2 } as any,
  cCardSub: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.42)", marginTop: 3 } as any,
});

// __STYLES__
