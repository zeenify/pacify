/* HALL OF SHAME — the wall of infamy. 3 samples, one per Persona era:
   A = P5 all-out-attack splash, B = P4 Midnight Channel CRT, C = P3 seabed registry. */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
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
  const [sample, setSample] = useState<any>("a");
  const [rows, setRows] = useState<ShameRow[] | null>(null);

  useEffect(() => {
    api("/shame")
      .then((d: any) => setRows(d.rows))
      .catch(() => setRows([]));
  }, []);

  if (!rows) {
    return (
      <View style={s.stage as any}>
        <Text
          style={[
            s.loadingTxt as any,
            web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any),
          ]}
        >
          PULLING THE RECORDS…
        </Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20 } as any} />
      <View style={s.picker as any}>
        {["a", "b", "c"].map((k) => (
          <Pressable key={k} onPress={() => setSample(k)} style={[s.pickBtn as any, sample === k && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{k.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {sample === "a" && <SampleA rows={rows} />}
      {sample === "b" && <SampleB rows={rows} />}
      {sample === "c" && <SampleC rows={rows} />}
    </View>
  );
}

/* ============ A — ALL-OUT ATTACK SPLASH (P5) ============ */
function SampleA({ rows }: { rows: ShameRow[] }) {
  const top = rows[0];
  return (
    <>
      {/* white slash band across everything */}
      <View style={s.aBandSkew as any} pointerEvents="none">
        <View style={[s.aBand as any, web && ({ animation: "p5-slashA 700ms 150ms cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>
      <View style={s.aBand2Skew as any} pointerEvents="none">
        <View style={[s.aBand2 as any, web && ({ animation: "p5-slashB 700ms 300ms cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>

      <View style={s.aCenter as any}>
        {/* giant ransom title slamming in */}
        <View style={{ alignItems: "center" } as any}>
          {["HALL", "OF", "SHAME"].map((word, w) => (
            <View key={word} style={{ flexDirection: "row", gap: 8 } as any}>
              {word.split("").map((ch, i) => {
                const gi = w * 3 + i;
                const boxed = gi % 3 === 0;
                const yellowed = gi % 3 === 2;
                return (
                  <View key={i} style={[s.aBox as any, boxed && (s.aBoxC as any), yellowed && (s.aBoxY as any), web && ({ animation: `heroIn 420ms ${gi * 55 + 100}ms both` } as any)]}>
                    <Text style={[s.aBoxTxt as any, boxed && { color: theme.color.paper } as any]}>{ch}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[s.aSub as any, web && ({ animation: "heroIn 500ms 500ms both" } as any)]}>
          THE WORST OF THE FIRST-YEAR BODY — {top ? `CURRENT KING: ${top.name}` : ""}
        </Text>

        {/* wanted-poster rows */}
        <View style={{ width: "min(94%, 760px)", gap: 10, marginTop: 26 } as any}>
          {rows.slice(0, 9).map((r, i) => (
            <Pressable
              key={r.rank}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.aRow as any,
                r.isMe && (s.aRowMe as any),
                hovered && !r.isMe && (s.aRowHov as any),
                web && ({ animation: `jokerIn 450ms ${550 + i * 70}ms both` } as any),
              ]}
            >
              <View style={[s.aRankBox as any, i === 0 && (s.aRankGold as any)]}>
                <Text style={s.aRankTxt as any}>{String(r.rank).padStart(2, "0")}</Text>
              </View>
              <View style={{ flex: 1 } as any}>
                <Text style={s.aName as any}>
                  {r.name}
                  {r.isNpc ? <Text style={s.aNpcTag}> — NPC</Text> : null}
                  {r.isMe ? <Text style={s.aMeTag}> ← YOU</Text> : null}
                </Text>
                <Text style={s.aStats as any}>{r.losses} LOSSES · {r.wins} WINS · WIN RATE {r.winRate}%</Text>
              </View>
              <View style={s.aScoreCol as any}>
                <Text style={s.aScore as any}>{r.shameScore}</Text>
                <Text style={s.aScoreLbl as any}>SHAME</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

/* ============ B — MIDNIGHT CHANNEL (P4): CRT frame, scanlines, test stripes ============ */
function SampleB({ rows }: { rows: ShameRow[] }) {
  return (
    <View style={s.bOuter as any}>
      {/* TV test-pattern stripe bars */}
      <View style={s.bStripe as any} pointerEvents="none">
        {["#E60012", "#FCEE21", "#1FB6FF", "#ffffff", "#0a0a0a"].map((c) => (
          <View key={c} style={[s.bStripeSeg as any, { backgroundColor: c }]} />
        ))}
      </View>

      {/* the CRT */}
      <View style={[s.bCrt as any, web && ({ animation: "jokerIn 500ms 120ms both" } as any)]}>
        {web && <View style={s.bScanlines as any} pointerEvents="none" />}
        {web && <View style={s.bGlass as any} pointerEvents="none" />}

        {/* channel header */}
        <View style={s.bHead as any}>
          <View style={s.bKnob as any}>
            <Text style={s.bKnobTxt as any}>CH</Text>
          </View>
          <Text style={s.bTitle as any}>MIDNIGHT CHANNEL</Text>
          <Text style={s.bEp as any}>EP.13 — "WHO FAILS HARDEST?"</Text>
        </View>

        <View style={{ gap: 8 } as any}>
          {rows.slice(0, 9).map((r, i) => (
            <Pressable
              key={r.rank}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.bRow as any,
                r.isMe && (s.bRowMe as any),
                hovered && (s.bRowHov as any),
                web && ({ animation: `rowIn 380ms ${300 + i * 65}ms both` } as any),
              ]}
            >
              <Text style={s.bRank as any}>#{r.rank}</Text>
              <View style={{ flex: 1 } as any}>
                <Text style={s.bName as any}>
                  {r.name}
                  {r.isNpc ? <Text style={s.bNpc}> ·NPC</Text> : null}
                  {r.isMe ? <Text style={s.bMe}> ◀ YOU</Text> : null}
                </Text>
                <Text style={s.bStats as any}>{r.losses} LOSSES / WIN RATE {r.winRate}% — SHAME {r.shameScore}</Text>
              </View>
              {/* static bar — longer = more shame */}
              <View style={s.bBarTrack as any}>
                <View style={[s.bBarFill as any, { width: `${Math.min(100, Math.max(6, r.shameScore))}%` } as any]} />
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={s.bFoot as any}>BROADCASTING EVERY NIGHT AT 12:00 — DO NOT ADJUST YOUR SET</Text>
      </View>

      <View style={[s.bStripe, s.bStripeBottom as any] as any} pointerEvents="none">
        {["#E60012", "#FCEE21", "#1FB6FF", "#ffffff", "#0a0a0a"].map((c) => (
          <View key={c} style={[s.bStripeSeg as any, { backgroundColor: c }]} />
        ))}
      </View>
    </View>
  );
}

/* ============ C — SEABED REGISTRY (P3): deep blue, bubbles, glass shards ============ */
function SampleC({ rows }: { rows: ShameRow[] }) {
  return (
    <View style={s.cStage as any}>
      {/* deep water gradient */}
      {web && <View style={s.cWater as any} pointerEvents="none" />}
      {/* rising bubbles */}
      {web && (
        <View style={s.bubbles as any} pointerEvents="none">
          {Array.from({ length: 14 }).map((_, i) => (
            <View
              key={i}
              style={[
                s.bubble as any,
                {
                  left: `${(i * 37) % 96}%`,
                  width: 4 + ((i * 7) % 12),
                  height: 4 + ((i * 7) % 12),
                  animationDuration: `${6 + (i % 5) * 1.7}s`,
                  animationDelay: `${-(i * 0.9)}s`,
                } as any,
              ]}
            />
          ))}
        </View>
      )}
      {/* waning crescent moon */}
      {web && (
        <View style={s.moonWrap as any} pointerEvents="none">
          <View style={s.moon as any}>
            <View style={s.moonBite as any} />
          </View>
          <Text style={s.moonLbl as any}>THE DARK HOUR KEEPS SCORE</Text>
        </View>
      )}

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: "8%", zIndex: 3 } as any}>
        <Text style={[s.cKicker as any, web && ({ animation: "heroIn 500ms 100ms both" } as any)]}>REGISTRY OF THE SUNKEN</Text>
        <Text style={[s.cTitle as any, web && ({ animation: "heroIn 550ms 200ms both" } as any)]}>HALL OF SHAME</Text>
        <View style={[s.cRule as any, web && ({ animation: "p5-entrance 600ms 350ms both" } as any)]} />

        <View style={{ gap: 9, marginTop: 22 } as any}>
          {rows.slice(0, 9).map((r, i) => (
            <Pressable
              key={r.rank}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.cRow as any,
                r.isMe && (s.cRowMe as any),
                hovered && (s.cRowHov as any),
                web && ({ animation: `rowIn 400ms ${400 + i * 70}ms both` } as any),
              ]}
            >
              <Text style={s.cRank as any}>{String(r.rank).padStart(2, "0")}</Text>
              <View style={{ flex: 1 } as any}>
                <Text style={s.cName as any}>
                  {r.name}
                  {r.isNpc ? <Text style={s.cNpc}> — npc</Text> : null}
                  {r.isMe ? <Text style={s.cMe}> — you</Text> : null}
                </Text>
                <Text style={s.cStats as any}>{r.losses} LOSSES · {r.wins} WINS · RATE {r.winRate}%</Text>
              </View>
              <Text style={s.cScore as any}>{r.shameScore}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.cFoot as any}>MEMENTO MORI, FIRST YEARS.</Text>
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
  loadingTxt: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,

  picker: { position: "absolute", top: 20, right: 20, zIndex: 99, flexDirection: "row", gap: 6 } as any,
  pickBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(0,0,0,0.55)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.paper } as any,

  /* A */
  aBandSkew: { position: "absolute", top: "18%", left: "-12%", width: "130%", height: 90, transform: [{ rotate: "-7deg" }], zIndex: 1 } as any,
  aBand: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.paper, opacity: 0.9 } as any,
  aBand2Skew: { position: "absolute", top: "26%", left: "-12%", width: "130%", height: 26, transform: [{ rotate: "-7deg" }], zIndex: 1 } as any,
  aBand2: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.yellow, opacity: 0.85 } as any,
  aCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 46, paddingBottom: 24, gap: 10, zIndex: 3 } as any,
  aBox: { minWidth: 62, height: 74, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: theme.color.black, backgroundColor: "#fff" } as any,
  aBoxC: { backgroundColor: theme.color.crimson } as any,
  aBoxY: { backgroundColor: theme.color.yellow } as any,
  aBoxTxt: { fontFamily: theme.font.display, fontSize: 50, lineHeight: 56, color: theme.color.black } as any,
  aSub: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 4, color: theme.color.paper, fontWeight: "800", textAlign: "center", marginTop: 8 } as any,
  aRow: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#141414", borderWidth: 2, borderColor: "#2b2b2b", borderLeftWidth: 7, borderLeftColor: theme.color.crimson, paddingVertical: 11, paddingHorizontal: 16, transform: [{ skewX: "-3deg" }] } as any,
  aRowMe: { backgroundColor: "#241a00", borderColor: theme.color.yellow, borderLeftColor: theme.color.yellow } as any,
  aRowHov: { transform: [{ skewX: "-3deg" }, { translateX: 8 }], borderColor: theme.color.paper } as any,
  aRankBox: { width: 52, height: 52, alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.crimson, transform: [{ skewX: "6deg" }] } as any,
  aRankGold: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  aRankTxt: { fontFamily: theme.font.display, fontSize: 22, color: theme.color.paper } as any,
  aName: { fontFamily: theme.font.body, fontSize: 17, fontWeight: "900", color: theme.color.paper, letterSpacing: 1.5 } as any,
  aNpcTag: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 } as any,
  aMeTag: { fontSize: 13, color: theme.color.yellow, fontWeight: "800" } as any,
  aStats: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 2, color: "rgba(255,255,255,0.42)", marginTop: 3 } as any,
  aScoreCol: { alignItems: "flex-end", minWidth: 64 } as any,
  aScore: { fontFamily: theme.font.display, fontSize: 30, lineHeight: 32, color: theme.color.crimson } as any,
  aScoreLbl: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.4)" } as any,

  /* B */
  bOuter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, zIndex: 2 } as any,
  bStripe: { position: "absolute", top: 0, left: 0, right: 0, height: 14, flexDirection: "row" } as any,
  bStripeBottom: { top: "auto", bottom: 0 } as any,
  bStripeSeg: { flex: 1 } as any,
  bCrt: {
    width: "min(94%, 780px)",
    maxHeight: "86%",
    backgroundColor: "#0d0d0d",
    borderWidth: 10,
    borderBottomWidth: 22,
    borderColor: "#000",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: theme.color.yellow,
    shadowOpacity: 0.12,
    shadowRadius: 40,
    overflow: "hidden",
  } as any,
  bScanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 4px)",
    zIndex: 5,
  } as any,
  bGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 38%, transparent 46%)",
    zIndex: 6,
  } as any,
  bHead: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 } as any,
  bKnob: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: theme.color.yellow, alignItems: "center", justifyContent: "center" } as any,
  bKnobTxt: { fontFamily: theme.font.body, fontSize: 13, fontWeight: "800", color: theme.color.yellow } as any,
  bTitle: { fontFamily: theme.font.display, fontSize: 30, color: theme.color.yellow, letterSpacing: 2 } as any,
  bEp: { marginLeft: "auto", fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.45)", fontWeight: "700" } as any,
  bRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(252,238,33,0.04)", borderLeftWidth: 4, borderLeftColor: "rgba(252,238,33,0.35)", paddingVertical: 9, paddingHorizontal: 12 } as any,
  bRowHov: { backgroundColor: "rgba(252,238,33,0.1)", borderLeftColor: theme.color.yellow } as any,
  bRowMe: { backgroundColor: "rgba(230,0,18,0.14)", borderLeftColor: theme.color.crimson } as any,
  bRank: { width: 44, fontFamily: theme.font.display, fontSize: 19, color: theme.color.yellow } as any,
  bName: { fontFamily: theme.font.body, fontSize: 15.5, fontWeight: "900", color: theme.color.paper, letterSpacing: 1 } as any,
  bNpc: { fontSize: 11, color: "rgba(255,255,255,0.3)" } as any,
  bMe: { fontSize: 12, color: theme.color.crimson, fontWeight: "800" } as any,
  bStats: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginTop: 2 } as any,
  bBarTrack: { width: 120, height: 12, backgroundColor: "#000", borderWidth: 1, borderColor: "#333" } as any,
  bBarFill: { height: "100%", backgroundImage: "repeating-linear-gradient(90deg, #FCEE21 0 8px, #111 8px 10px)" } as any,
  bFoot: { marginTop: 14, textAlign: "center", fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 3, color: "rgba(255,255,255,0.35)" } as any,

  /* C */
  cStage: { flex: 1, backgroundColor: "#04101f", overflow: "hidden" } as any,
  cWater: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: "linear-gradient(180deg, #0e2a52 0%, #081a36 45%, #04101f 100%)",
  } as any,
  bubbles: { ...StyleSheet.absoluteFillObject } as any,
  bubble: {
    position: "absolute",
    bottom: -30,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(31,182,255,0.5)",
    backgroundColor: "rgba(31,182,255,0.06)",
    animationName: "p5-rise",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in",
  } as any,
  moonWrap: { position: "absolute", top: "7%", right: "8%", alignItems: "center", gap: 8 } as any,
  moon: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#EAF3FF", opacity: 0.85 } as any,
  moonBite: { position: "absolute", top: -10, right: -12, width: 70, height: 70, borderRadius: 35, backgroundColor: "#081a36" } as any,
  moonLbl: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(234,243,255,0.5)", fontWeight: "700" } as any,

  cKicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 7, color: "#7fd4ff", fontWeight: "700" } as any,
  cTitle: { fontFamily: theme.font.display, fontSize: 54, lineHeight: 58, color: "#EAF3FF", letterSpacing: 2, textShadow: "0 0 26px rgba(31,182,255,0.45)" } as any,
  cRule: { width: 220, height: 2, backgroundColor: "rgba(127,212,255,0.5)", marginTop: 10 } as any,

  cRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(127,212,255,0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "rgba(127,212,255,0.4)",
    borderTopWidth: 1,
    borderTopColor: "rgba(234,243,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    transform: [{ skewX: "-4deg" }],
  } as any,
  cRowHov: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderLeftColor: theme.color.crimson,
    ...(web ? ({ boxShadow: "0 0 22px rgba(255,255,255,0.25)" } as any) : {}),
  } as any,
  cRowMe: { borderLeftColor: theme.color.crimson, backgroundColor: "rgba(230,0,18,0.12)" } as any,
  cRank: { width: 40, fontFamily: theme.font.display, fontSize: 21, color: "#7fd4ff" } as any,
  cName: { fontFamily: theme.font.body, fontSize: 16, fontWeight: "800", letterSpacing: 1.5, color: "#EAF3FF" } as any,
  cNpc: { fontSize: 11, color: "rgba(234,243,255,0.35)" } as any,
  cMe: { fontSize: 12, color: theme.color.crimson, fontWeight: "800" } as any,
  cStats: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: "rgba(234,243,255,0.45)", marginTop: 2 } as any,
  cScore: { fontFamily: theme.font.display, fontSize: 26, color: "#7fd4ff", opacity: 0.9 } as any,
  cFoot: { marginTop: 18, fontFamily: theme.font.body, fontSize: 11, letterSpacing: 5, color: "rgba(234,243,255,0.4)" } as any,
});
