/* HALL OF SHAME — Sample A locked as base theme. D/E/F explore STRUCTURE
   patterns from P3/P4/P5 menus, rebuilt in Pacify's crimson/black/yellow
   language. Every sample fits the viewport; long lists scroll. */
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
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>PULLING THE RECORDS…</Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />
      <View style={s.picker as any}>
        {["a", "d", "e", "f"].map((k) => (
          <Pressable key={k} onPress={() => setSample(k)} style={[s.pickBtn as any, sample === k && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{k.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {sample === "a" && <SampleA rows={rows} />}
      {sample === "d" && <SampleD rows={rows} />}
      {sample === "e" && <SampleE rows={rows} />}
      {sample === "f" && <SampleF rows={rows} />}
    </View>
  );
}

/* ============ A — ALL-OUT ATTACK SPLASH (LOCKED BASE) ============ */
function SampleA({ rows }: { rows: ShameRow[] }) {
  const top = rows[0];
  return (
    <>
      <View style={s.aBandSkew as any} pointerEvents="none">
        <View style={[s.aBand as any, web && ({ animation: "p5-slashA 700ms 150ms cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>

      <View style={s.aCenter as any}>
        <View style={{ alignItems: "center" } as any}>
          {["HALL", "OF", "SHAME"].map((word, w) => (
            <View key={word} style={{ flexDirection: "row", gap: 6 } as any}>
              {word.split("").map((ch, i) => {
                const gi = w * 3 + i;
                const boxed = gi % 3 === 0;
                const yellowed = gi % 3 === 2;
                return (
                  <View key={i} style={[s.aBox as any, boxed && (s.aBoxC as any), yellowed && (s.aBoxY as any), web && ({ animation: `heroIn 420ms ${gi * 50 + 80}ms both` } as any)]}>
                    <Text style={[s.aBoxTxt as any, boxed && { color: theme.color.paper } as any]}>{ch}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[s.aSub as any, web && ({ animation: "heroIn 500ms 420ms both" } as any)]}>
          THE WORST OF THE FIRST-YEAR BODY{top ? ` — REIGNING KING: ${top.name}` : ""}
        </Text>

        <ScrollView style={{ width: "min(94%, 760px)" }} contentContainerStyle={{ gap: 8, paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
          {rows.slice(0, 9).map((r, i) => (
            <Pressable
              key={r.rank}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.aRow as any,
                r.isMe && (s.aRowMe as any),
                hovered && !r.isMe && (s.aRowHov as any),
                web && ({ animation: `jokerIn 420ms ${450 + i * 60}ms both` } as any),
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
                <Text style={s.aStats as any}>{r.losses} LOSSES · {r.wins} WINS · RATE {r.winRate}%</Text>
              </View>
              <View style={s.aScoreCol as any}>
                <Text style={s.aScore as any}>{r.shameScore}</Text>
                <Text style={s.aScoreLbl as any}>SHAME</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

/* ============ D — "SEABED REGISTRY" PATTERN: split panel, hairline ledger ============
   P3R's structure — big calm identity column + thin-line scrolling ledger with
   the complement flash hover — rendered in Pacify colors. */
function SampleD({ rows }: { rows: ShameRow[] }) {
  const king = rows[0];
  return (
    <View style={s.dWrap as any}>
      {/* rising ember sparks (our take on P3's bubbles) */}
      {web && (
        <View style={s.dEmbers as any} pointerEvents="none">
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={i}
              style={[
                s.dEmber as any,
                {
                  left: `${(i * 41) % 94}%`,
                  width: 3 + ((i * 5) % 5),
                  height: 3 + ((i * 5) % 5),
                  animationDuration: `${7 + (i % 4) * 2}s`,
                  animationDelay: `${-i * 1.1}s`,
                } as any,
              ]}
            />
          ))}
        </View>
      )}

      {/* left — identity column */}
      <View style={s.dLeft as any}>
        {["S", "H", "A", "M", "E"].map((ch, i) => (
          <Text
            key={i}
            style={[s.dLetter as any, i % 2 === 1 && { color: theme.color.crimson, textShadow: `3px 3px 0 ${theme.color.paper}` } as any, web && ({ animation: `heroIn 420ms ${i * 60}ms both` } as any)]}
          >
            {ch}
          </Text>
        ))}
        {king && (
          <View style={[s.dKingCard as any, web && ({ animation: "jokerIn 450ms 400ms both" } as any)]}>
            <Text style={s.dKingKicker as any}>REIGNING KING</Text>
            <Text style={s.dKingName as any}>{king.name}</Text>
            <Text style={s.dKingStat as any}>{king.losses} LOSSES · SHAME {king.shameScore}</Text>
          </View>
        )}
      </View>

      {/* right — hairline ledger */}
      <View style={s.dRight as any}>
        <View style={s.dLedgerHead as any}>
          <Text style={s.dLedgerTitle as any}>REGISTRY OF THE SUNKEN</Text>
          <View style={s.dRule as any} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {rows.map((r, i) => (
            <Pressable
              key={r.rank}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.dRow as any,
                r.isMe && (s.dRowMe as any),
                hovered && (s.dRowFlash as any),
                web && ({ animation: `rowIn 380ms ${300 + i * 45}ms both` } as any),
              ]}
            >
              <Text style={s.dRank as any}>{String(r.rank).padStart(2, "0")}</Text>
              <View style={{ flex: 1 } as any}>
                <Text style={s.dName as any}>
                  {r.name}
                  {r.isNpc ? <Text style={s.dNpc}> ·npc</Text> : null}
                  {r.isMe ? <Text style={s.dMe}> — you</Text> : null}
                </Text>
                <Text style={s.dSub as any}>{r.losses}L / {r.wins}W / RATE {r.winRate}%</Text>
              </View>
              <Text style={s.dScore as any}>{r.shameScore}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/* ============ E — "CRT BROADCAST" PATTERN: framed set + static bars ============
   P4's structure — chunky bezel, scanlines, channel header, signal bars —
   recolored to Pacify. The frame itself scrolls its content. */
function SampleE({ rows }: { rows: ShameRow[] }) {
  return (
    <View style={s.eOuter as any}>
      <View style={[s.eCrt as any, web && ({ animation: "jokerIn 500ms 100ms both" } as any)]}>
        {web && <View style={s.eScan as any} pointerEvents="none" />}

        {/* channel stripe */}
        <View style={s.eStripe as any} pointerEvents="none">
          {[theme.color.crimson, theme.color.yellow, theme.color.paper, "#1c1c1c"].map((c) => (
            <View key={c} style={[{ flex: 1, backgroundColor: c } as any]} />
          ))}
        </View>

        <View style={s.eHead as any}>
          <View style={s.eKnob as any}>
            <Text style={s.eKnobTxt as any}>CH</Text>
          </View>
          <Text style={s.eTitle as any}>CHANNEL PACIFY</Text>
          <Text style={s.eEp as any}>EP.13 — "WHO FAILS HARDEST?"</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 7, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {rows.map((r, i) => (
            <Pressable
              key={r.rank}
              onHoverIn={playHover}
              style={({ hovered }) => [
                s.eRow as any,
                r.isMe && (s.eRowMe as any),
                hovered && (s.eRowHov as any),
                web && ({ animation: `rowIn 380ms ${260 + i * 50}ms both` } as any),
              ]}
            >
              <Text style={s.eRank as any}>#{r.rank}</Text>
              <View style={{ flex: 1 } as any}>
                <Text style={s.eName as any}>
                  {r.name}
                  {r.isNpc ? <Text style={s.eNpc}> ·npc</Text> : null}
                  {r.isMe ? <Text style={s.eMe}> ◀ you</Text> : null}
                </Text>
                {/* static bar — length = shame */}
                <View style={s.eBarTrack as any}>
                  <View style={[s.eBarFill as any, { width: `${Math.min(100, Math.max(6, r.shameScore))}%` } as any]} />
                </View>
              </View>
              <Text style={s.eScore as any}>{r.shameScore}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={s.eFoot as any}>BROADCASTING NIGHTLY — DO NOT ADJUST YOUR SET</Text>
      </View>
    </View>
  );
}

/* ============ F — "PAUSE MENU PODIUM" PATTERN: gaze column + top-3 slabs ============
   P5's own pause-menu anatomy — skewed slab stack, one-point-perspective
   hierarchy — with a podium feeding a scrolling roster. */
function SampleF({ rows }: { rows: ShameRow[] }) {
  const [p2, king, p3] = rows;
  const rest = rows.slice(3);
  const podium = [
    { r: p2, h: 92, label: "2ND" },
    { r: king, h: 128, label: "1ST — KING" },
    { r: p3, h: 100, label: "3RD" },
  ];
  return (
    <View style={s.fWrap as any}>
      {/* header */}
      <View style={s.fHead as any}>
        <Text style={s.fKicker as any}>PACIFY — FIRST YEAR DIVISION</Text>
        <Text style={s.fTitle as any}>HALL OF SHAME</Text>
        <View style={s.fUnderline as any} />
      </View>

      {/* podium */}
      <View style={s.fPodium as any}>
        {podium.map(({ r, h, label }, i) =>
          r ? (
            <View key={label} style={[s.fSlab as any, { height: h } as any, i === 1 && (s.fSlabKing as any), web && ({ animation: `jokerIn 450ms ${200 + i * 110}ms both` } as any)]}>
              <Text style={[s.fSlabRank as any, i === 1 && (s.fSlabRankGold as any)]}>{label}</Text>
              <Text style={s.fSlabName as any}>{r.name}</Text>
              <Text style={s.fSlabScore as any}>SHAME {r.shameScore}</Text>
            </View>
          ) : null
        )}
      </View>

      {/* roster */}
      <ScrollView style={s.fScroll as any} contentContainerStyle={{ gap: 6, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
        {rest.map((r, i) => (
          <Pressable
            key={r.rank}
            onHoverIn={playHover}
            style={({ hovered }) => [s.fRow as any, r.isMe && (s.fRowMe as any), hovered && (s.fRowHov as any), web && ({ animation: `rowIn 350ms ${520 + i * 40}ms both` } as any)]}
          >
            <Text style={s.fRowRank as any}>{String(r.rank).padStart(2, "0")}</Text>
            <Text style={s.fRowName as any}>
              {r.name}
              {r.isNpc ? <Text style={s.fNpc}> ·npc</Text> : null}
              {r.isMe ? <Text style={s.fMe}> ← you</Text> : null}
            </Text>
            <Text style={s.fRowScore as any}>{r.shameScore}</Text>
            {web ? null : null}
          </Pressable>
        ))}
      </ScrollView>

      <Text style={s.fFoot as any}>DON'T BE LISTED HERE.</Text>
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
  aBandSkew: { position: "absolute", top: "16%", left: "-12%", width: "130%", height: 74, transform: [{ rotate: "-7deg" }], zIndex: 1 } as any,
  aBand: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.paper, opacity: 0.9 } as any,
  aCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 52, paddingBottom: 18, gap: 8, zIndex: 3 } as any,
  aBox: { minWidth: 56, height: 64, paddingHorizontal: 7, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: theme.color.black, backgroundColor: "#fff" } as any,
  aBoxC: { backgroundColor: theme.color.crimson } as any,
  aBoxY: { backgroundColor: theme.color.yellow } as any,
  aBoxTxt: { fontFamily: theme.font.display, fontSize: 42, lineHeight: 48, color: theme.color.black } as any,
  aSub: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 4, color: theme.color.paper, fontWeight: "800", textAlign: "center", marginTop: 6 } as any,
  aRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#141414", borderWidth: 2, borderColor: "#2b2b2b", borderLeftWidth: 7, borderLeftColor: theme.color.crimson, paddingVertical: 10, paddingHorizontal: 14, transform: [{ skewX: "-3deg" }] } as any,
  aRowMe: { backgroundColor: "#241a00", borderColor: theme.color.yellow, borderLeftColor: theme.color.yellow } as any,
  aRowHov: { transform: [{ skewX: "-3deg" }, { translateX: 8 }], borderColor: theme.color.paper } as any,
  aRankBox: { width: 46, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.crimson, transform: [{ skewX: "6deg" }] } as any,
  aRankGold: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  aRankTxt: { fontFamily: theme.font.display, fontSize: 20, color: theme.color.paper } as any,
  aName: { fontFamily: theme.font.body, fontSize: 16, fontWeight: "900", color: theme.color.paper, letterSpacing: 1.5 } as any,
  aNpcTag: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 } as any,
  aMeTag: { fontSize: 13, color: theme.color.yellow, fontWeight: "800" } as any,
  aStats: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.42)", marginTop: 2 } as any,
  aScoreCol: { alignItems: "flex-end", minWidth: 58 } as any,
  aScore: { fontFamily: theme.font.display, fontSize: 26, lineHeight: 28, color: theme.color.crimson } as any,
  aScoreLbl: { fontFamily: theme.font.body, fontSize: 9.5, letterSpacing: 3, color: "rgba(255,255,255,0.4)" } as any,

  /* D */
  dWrap: { flex: 1, flexDirection: "row", paddingHorizontal: "6%", paddingTop: 78, paddingBottom: 30, gap: 40, zIndex: 2, overflow: "hidden" } as any,
  dEmbers: { ...StyleSheet.absoluteFillObject } as any,
  dEmber: {
    position: "absolute",
    bottom: -14,
    borderRadius: 10,
    backgroundColor: "rgba(230,0,18,0.5)",
    animationName: "p5-rise",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in",
  } as any,
  dLeft: { width: 240, gap: 2 } as any,
  dLetter: { fontFamily: theme.font.display, fontSize: 84, lineHeight: 88, color: theme.color.paper, textShadow: `3px 3px 0 ${theme.color.crimson}` } as any,
  dKingCard: { marginTop: 22, backgroundColor: "#141414", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#2b2b2b", borderLeftWidth: 7, borderLeftColor: theme.color.yellow, paddingVertical: 14, paddingHorizontal: 16, transform: [{ skewX: "-3deg" }] } as any,
  dKingKicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: theme.color.yellow, fontWeight: "800" } as any,
  dKingName: { fontFamily: theme.font.display, fontSize: 23, color: theme.color.paper, marginTop: 4 } as any,
  dKingStat: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 2, color: "rgba(255,255,255,0.45)", marginTop: 4 } as any,
  dRight: { flex: 1, maxWidth: 640, alignSelf: "stretch", marginTop: 8 } as any,
  dLedgerHead: { marginBottom: 10 } as any,
  dLedgerTitle: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, fontWeight: "800" } as any,
  dRule: { width: "100%", height: 2, backgroundColor: "#2b2b2b", marginTop: 8 } as any,
  dRow: { flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: "#242424", paddingVertical: 11, paddingHorizontal: 10 } as any,
  dRowFlash: { backgroundColor: theme.color.paper, borderLeftWidth: 6, borderLeftColor: theme.color.crimson } as any,
  dRowMe: { backgroundColor: "#241a00" } as any,
  dRank: { width: 42, fontFamily: theme.font.display, fontSize: 19, color: "rgba(255,255,255,0.35)" } as any,
  dName: { fontFamily: theme.font.body, fontSize: 15.5, fontWeight: "900", color: theme.color.paper, letterSpacing: 1.5 } as any,
  dNpc: { fontSize: 11, color: "rgba(255,255,255,0.3)" } as any,
  dMe: { fontSize: 12, color: theme.color.yellow, fontWeight: "800" } as any,
  dSub: { fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 2, color: "rgba(255,255,255,0.38)", marginTop: 2 } as any,
  dScore: { fontFamily: theme.font.display, fontSize: 22, color: theme.color.crimson } as any,

  /* E */
  eOuter: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 2 } as any,
  eCrt: {
    width: "min(94%, 720px)",
    height: "82%",
    backgroundColor: "#0d0d0d",
    borderWidth: 9,
    borderBottomWidth: 20,
    borderColor: "#000",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: theme.color.yellow,
    shadowOpacity: 0.1,
    shadowRadius: 36,
    overflow: "hidden",
  } as any,
  eScan: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)",
    zIndex: 5,
  } as any,
  eStripe: { position: "absolute", top: 0, left: 0, right: 0, height: 10, flexDirection: "row", zIndex: 6 } as any,
  eHead: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 12 } as any,
  eKnob: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: theme.color.yellow, alignItems: "center", justifyContent: "center" } as any,
  eKnobTxt: { fontFamily: theme.font.body, fontSize: 12, fontWeight: "800", color: theme.color.yellow } as any,
  eTitle: { fontFamily: theme.font.display, fontSize: 25, color: theme.color.yellow, letterSpacing: 1.5 } as any,
  eEp: { marginLeft: "auto", fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 2, color: "rgba(255,255,255,0.42)", fontWeight: "700" } as any,
  eRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(252,238,33,0.04)", borderLeftWidth: 4, borderLeftColor: "rgba(252,238,33,0.3)", paddingVertical: 8, paddingHorizontal: 10 } as any,
  eRowHov: { backgroundColor: "rgba(252,238,33,0.1)", borderLeftColor: theme.color.yellow } as any,
  eRowMe: { backgroundColor: "rgba(230,0,18,0.14)", borderLeftColor: theme.color.crimson } as any,
  eRank: { width: 40, fontFamily: theme.font.display, fontSize: 17, color: theme.color.yellow } as any,
  eName: { fontFamily: theme.font.body, fontSize: 14.5, fontWeight: "900", color: theme.color.paper, letterSpacing: 1 } as any,
  eNpc: { fontSize: 10.5, color: "rgba(255,255,255,0.3)" } as any,
  eMe: { fontSize: 11.5, color: theme.color.crimson, fontWeight: "800" } as any,
  eBarTrack: { width: "100%", maxWidth: 260, height: 9, backgroundColor: "#000", borderWidth: 1, borderColor: "#333", marginTop: 5 } as any,
  eBarFill: { height: "100%", backgroundImage: "repeating-linear-gradient(90deg, #FCEE21 0 8px, #111 8px 10px)" } as any,
  eScore: { fontFamily: theme.font.display, fontSize: 21, color: theme.color.crimson } as any,
  eFoot: { marginTop: 10, textAlign: "center", fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.32)" } as any,

  /* F */
  fWrap: { flex: 1, alignItems: "center", paddingTop: 70, paddingBottom: 24, paddingHorizontal: 20, zIndex: 2 } as any,
  fHead: { alignItems: "center" } as any,
  fKicker: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 6, color: theme.color.yellow, fontWeight: "800" } as any,
  fTitle: { fontFamily: theme.font.display, fontSize: 42, lineHeight: 48, color: theme.color.paper, transform: [{ skewX: "-8deg" }], textShadow: `5px 5px 0 ${theme.color.crimson}`, marginTop: 4 } as any,
  fUnderline: { width: 190, height: 6, backgroundColor: theme.color.crimson, transform: [{ skewX: "-8deg" }], marginTop: 6 } as any,
  fPodium: { flexDirection: "row", alignItems: "flex-end", gap: 14, marginTop: 18 } as any,
  fSlab: {
    width: 190,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2b2b2b",
    borderBottomWidth: 6,
    borderBottomColor: theme.color.crimson,
    transform: [{ skewX: "-4deg" }],
    paddingVertical: 12,
    paddingHorizontal: 14,
  } as any,
  fSlabKing: {
    backgroundColor: theme.color.crimson,
    borderColor: theme.color.paper,
    borderBottomColor: theme.color.yellow,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowOffset: { width: 7, height: 7 },
  } as any,
  fSlabRank: { fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 3, color: theme.color.yellow, fontWeight: "800" } as any,
  fSlabRankGold: { color: theme.color.paper } as any,
  fSlabName: { fontFamily: theme.font.display, fontSize: 19, color: theme.color.paper, marginTop: 4 } as any,
  fSlabScore: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.5)", marginTop: 4 } as any,
  fScroll: { width: "min(94%, 680px)", flex: 1, marginTop: 18 } as any,
  fRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(255,255,255,0.03)", borderLeftWidth: 4, borderLeftColor: "transparent", paddingVertical: 8, paddingHorizontal: 12, transform: [{ skewX: "-2deg" }] } as any,
  fRowHov: { backgroundColor: "#141414", borderLeftColor: theme.color.yellow } as any,
  fRowMe: { backgroundColor: "#241a00", borderLeftColor: theme.color.crimson } as any,
  fRowRank: { width: 36, fontFamily: theme.font.display, fontSize: 15, color: "rgba(255,255,255,0.35)" } as any,
  fRowName: { flex: 1, fontFamily: theme.font.body, fontSize: 14.5, fontWeight: "800", color: theme.color.paper, letterSpacing: 1 } as any,
  fNpc: { fontSize: 10.5, color: "rgba(255,255,255,0.3)" } as any,
  fMe: { fontSize: 11.5, color: theme.color.yellow, fontWeight: "800" } as any,
  fRowScore: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.crimson } as any,
  fFoot: { marginTop: 12, fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 4, color: "rgba(255,255,255,0.35)" } as any,
});
