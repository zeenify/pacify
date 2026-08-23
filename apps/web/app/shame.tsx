/* HALL OF SHAME — LOCKED COMBINE: vertical ransom letters + podium (F) +
   wanted-poster rows (A), wrapped in custom game assets: counter-rotating
   target ring, speed-lines, drifting glyphs, marquee hazard tape, halftone,
   floating diamonds. Everything fits; roster scrolls. */
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { api } from "../lib/api";
import { playHover } from "../lib/sfx";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

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
  shameScore: number;
};

export default function Shame() {
  const [rows, setRows] = useState<ShameRow[] | null>(null);

  useEffect(() => {
    api("/shame")
      .then((d: any) => setRows(d.rows))
      .catch(() => setRows([]));
  }, []);

  if (!rows || rows.length === 0) {
    return (
      <View style={s.stage as any}>
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>PULLING THE RECORDS…</Text>
      </View>
    );
  }

  const [p2, king, p3] = rows;
  const rest = rows.slice(3);
  const podium = [
    { r: p2, h: 86, label: "2ND" },
    { r: king, h: 122, label: "1ST — KING" },
    { r: p3, h: 94, label: "3RD" },
  ];

  return (
    <View style={s.stage as any}>
      {/* ---- ambient assets ---- */}
      <View style={s.linesWrap as any} pointerEvents="none">
        {[
          { top: "20%", h: 4, dur: "10s", dir: "", col: "rgba(252,238,33,0.08)", d: "0s" },
          { top: "55%", h: 3, dur: "14s", dir: " reverse", col: "rgba(255,255,255,0.05)", d: "1s" },
          { top: "82%", h: 5, dur: "12s", dir: "", col: "rgba(230,0,18,0.09)", d: "0.4s" },
        ].map((L, i) => (
          <View key={i} style={{ position: "absolute", left: "-20%", right: "-20%", top: L.top, height: L.h, overflow: "hidden" } as any}>
            <View style={{ flexDirection: "row", width: "200%", transform: [{ skewX: "-16deg" }] } as any}>
              {[0, 1].map((half) => (
                <View
                  key={half}
                  style={[
                    { width: "100%", backgroundImage: `repeating-linear-gradient(90deg, ${L.col} 0 46px, transparent 46px 110px)`, height: L.h } as any,
                    web && ({ animation: `p5-marquee${L.dir} ${L.dur} linear infinite`, animationDelay: L.d } as any),
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      {web && (
        <View style={s.driftWrap as any} pointerEvents="none">
          {[
            { ch: "✕", t: "16%", l: "44%", sz: 30, o: 0.08 },
            { ch: "!", t: "70%", l: "8%", sz: 38, o: 0.06 },
            { ch: "?", t: "24%", l: "92%", sz: 34, o: 0.07 },
            { ch: "P", t: "84%", l: "60%", sz: 46, o: 0.04 },
          ].map((g, i) => (
            <Text
              key={i}
              style={[
                s.driftGlyph as any,
                { top: g.t, left: g.l, fontSize: g.sz, opacity: g.o } as any,
                { animationDuration: `${4.5 + i}s`, animationDelay: `${-i * 0.8}s` } as any,
              ]}
            >
              {g.ch}
            </Text>
          ))}
        </View>
      )}

      {/* target ring behind the podium */}
      {web && (
        <View style={s.ringW as any} pointerEvents="none">
          <View style={s.ring as any} />
          <View style={s.ringTicks as any}>
            {[0, 90, 180, 270].map((d) => (
              <View key={d} style={[s.ringTick as any, { transform: [{ rotate: d + "deg" }, { translateY: -120 }] } as any]} />
            ))}
          </View>
        </View>
      )}

      {/* floating diamonds */}
      {web && (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 } as any} pointerEvents="none">
          {[
            { t: "12%", l: "36%", s: 13, d: "0s" },
            { t: "76%", l: "30%", s: 10, d: "1.2s" },
            { t: "20%", l: "96%", s: 14, d: "0.7s" },
          ].map((dm, i) => (
            <Text key={i} style={[s.diamond as any, { top: dm.t, left: dm.l, fontSize: dm.s }, { animationDelay: dm.d } as any]}>
              ◆
            </Text>
          ))}
        </View>
      )}

      {/* halftone patch */}
      {web && <View style={s.halftone as any} pointerEvents="none" />}

      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />

      {/* ---- content ---- */}
      <View style={s.wrap as any}>
        {/* LEFT — vertical ransom letters */}
        <View style={s.lettersCol as any}>
          {["H", "A", "L", "L", "O", "F", "S", "H", "A", "M", "E"].map((ch, i) => (
            <View key={i} style={i > 3 && i < 6 ? { paddingLeft: 26 } : null}>
              <Text
                style={[
                  s.vLetter as any,
                  i % 3 === 0 && (s.vLetterC as any),
                  i % 3 === 2 && (s.vLetterY as any),
                  web && ({ animation: `heroIn 400ms ${i * 55}ms both` } as any),
                ]}
              >
                {ch}
              </Text>
            </View>
          ))}
        </View>

        {/* RIGHT — podium + roster */}
        <View style={s.mainCol as any}>
          {/* podium */}
          <View style={s.podium as any}>
            {podium.map(({ r, h, label }, i) =>
              r ? (
                <View key={label} style={[s.slab as any, { height: h } as any, i === 1 && (s.slabKing as any), web && ({ animation: `jokerIn 450ms ${150 + i * 110}ms both` } as any)]}>
                  <Text style={[s.slabRank as any, i === 1 && (s.slabRankGold as any)]}>{label}</Text>
                  <Text style={s.slabName as any}>{r.name}</Text>
                  <Text style={s.slabScore as any}>SHAME {r.shameScore}</Text>
                </View>
              ) : null
            )}
          </View>

          {/* roster */}
          <ScrollView style={s.roster as any} contentContainerStyle={{ gap: 8, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
            {rest.map((r, i) => (
              <Pressable
                key={r.rank}
                onHoverIn={playHover}
                style={({ hovered }) => [
                  s.row as any,
                  r.isMe && (s.rowMe as any),
                  hovered && (s.rowHov as any),
                  web && ({ animation: `jokerIn 420ms ${480 + i * 55}ms both` } as any),
                ]}
              >
                <View style={s.rankBox as any}>
                  <Text style={s.rankTxt as any}>{String(r.rank).padStart(2, "0")}</Text>
                </View>
                <View style={{ flex: 1 } as any}>
                  <Text style={s.rowName as any}>
                    {r.name}
                    {r.isNpc ? <Text style={s.npcTag}> — NPC</Text> : null}
                    {r.isMe ? <Text style={s.meTag}> ← YOU</Text> : null}
                  </Text>
                  <Text style={s.rowStats as any}>{r.losses} LOSSES · {r.wins} WINS · RATE {r.winRate}%</Text>
                </View>
                <View style={s.scoreCol as any}>
                  <Text style={s.score as any}>{r.shameScore}</Text>
                  <Text style={s.scoreLbl as any}>SHAME</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={s.foot as any}>DON'T BE LISTED HERE.</Text>
        </View>
      </View>

      {/* hazard tape floor */}
      <View style={s.tapeWrap as any} pointerEvents="none">
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

  /* ambient */
  linesWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1 } as any,
  driftWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1 } as any,
  driftGlyph: {
    position: "absolute",
    fontFamily: theme.font.display,
    color: theme.color.crimson,
    textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    animation: "p5-float 5s ease-in-out infinite",
  } as any,
  ringW: { position: "absolute", left: "50%", top: "12%", width: 300, height: 300, marginLeft: -150, alignItems: "center", justifyContent: "center", zIndex: 1 } as any,
  ring: { width: 260, height: 260, borderRadius: 130, borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(252,238,33,0.28)", animation: "p5-spin 26s linear infinite" } as any,
  ringTicks: { position: "absolute", width: 300, height: 300, alignItems: "center", justifyContent: "center", animation: "p5-spinRev 38s linear infinite" } as any,
  ringTick: { position: "absolute", width: 4, height: 16, backgroundColor: "rgba(230,0,18,0.45)" } as any,
  diamond: {
    position: "absolute",
    color: theme.color.yellow,
    textShadow: "2px 2px 0 rgba(0,0,0,0.55)",
    animation: "p5-float 3.6s ease-in-out infinite",
  } as any,
  halftone: {
    position: "absolute",
    top: "9%",
    right: "7%",
    width: 190,
    height: 120,
    opacity: 0.09,
    backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)",
    backgroundSize: "12px 12px",
    transform: [{ skewX: "-10deg" }, { rotate: "3deg" }],
    zIndex: 1,
  } as any,
  tapeWrap: { position: "absolute", bottom: 0, left: 0, right: 0, overflow: "hidden", zIndex: 8 } as any,

  /* layout */
  wrap: { flex: 1, flexDirection: "row", paddingHorizontal: "4%", paddingTop: 64, paddingBottom: 34, gap: 34, zIndex: 3 } as any,

  lettersCol: { width: 96 } as any,
  vLetter: { fontFamily: theme.font.display, fontSize: 50, lineHeight: 54, color: theme.color.paper, textShadow: `3px 3px 0 ${theme.color.crimson}`, textAlign: "center" } as any,
  vLetterC: { color: theme.color.crimson, textShadow: `3px 3px 0 ${theme.color.paper}` } as any,
  vLetterY: { color: theme.color.yellow, textShadow: `3px 3px 0 ${theme.color.black}` } as any,

  mainCol: { flex: 1, maxWidth: 720, alignSelf: "stretch" } as any,
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 14, justifyContent: "center", marginBottom: 14 } as any,
  slab: {
    width: 178,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2b2b2b",
    borderBottomWidth: 6,
    borderBottomColor: theme.color.crimson,
    transform: [{ skewX: "-4deg" }],
    paddingVertical: 11,
    paddingHorizontal: 13,
  } as any,
  slabKing: {
    backgroundColor: theme.color.crimson,
    borderColor: theme.color.paper,
    borderBottomColor: theme.color.yellow,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowOffset: { width: 7, height: 7 },
  } as any,
  slabRank: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.yellow, fontWeight: "800" } as any,
  slabRankGold: { color: theme.color.paper } as any,
  slabName: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.paper, marginTop: 3 } as any,
  slabScore: { fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 2, color: "rgba(255,255,255,0.5)", marginTop: 3 } as any,

  roster: { flex: 1 } as any,
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2b2b2b",
    borderLeftWidth: 7,
    borderLeftColor: theme.color.crimson,
    paddingVertical: 9,
    paddingHorizontal: 13,
    transform: [{ skewX: "-3deg" }],
  } as any,
  rowMe: { backgroundColor: "#241a00", borderColor: theme.color.yellow, borderLeftColor: theme.color.yellow } as any,
  rowHov: { transform: [{ skewX: "-3deg" }, { translateX: 8 }], borderColor: theme.color.paper } as any,
  rankBox: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.crimson, transform: [{ skewX: "6deg" }] } as any,
  rankTxt: { fontFamily: theme.font.display, fontSize: 17, color: theme.color.paper } as any,
  rowName: { fontFamily: theme.font.body, fontSize: 15, fontWeight: "900", color: theme.color.paper, letterSpacing: 1.5 } as any,
  npcTag: { fontSize: 10.5, color: "rgba(255,255,255,0.35)", letterSpacing: 1 } as any,
  meTag: { fontSize: 12, color: theme.color.yellow, fontWeight: "800" } as any,
  rowStats: { fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 2, color: "rgba(255,255,255,0.42)", marginTop: 2 } as any,
  scoreCol: { alignItems: "flex-end", minWidth: 52 } as any,
  score: { fontFamily: theme.font.display, fontSize: 23, lineHeight: 25, color: theme.color.crimson } as any,
  scoreLbl: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.4)" } as any,
  foot: { marginTop: 10, textAlign: "center", fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 4, color: "rgba(255,255,255,0.35)", paddingBottom: 4 } as any,
});
