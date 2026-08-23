/* HALL OF SHAME — LOCKED. Centered premium composition: giant ransom title
   stack, podium with medals/ribbons/tacks, poster roster, framed by a live
   ticker, target ring, starburst, speed-lines, drifting glyphs, halftone,
   diamonds and a marquee hazard floor. Roster scrolls; nothing overlaps. */
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
  const [hovSlab, setHovSlab] = useState(-1);

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

  // positions come from RANK, never array order — immune to stale/unsorted data
  const king = rows.find((r) => r.rank === 1) ?? null;
  const p2 = rows.find((r) => r.rank === 2) ?? null;
  const p3 = rows.find((r) => r.rank === 3) ?? null;
  const rest = rows.filter((r) => r.rank > 3);
  const tickerSrc = `HALL OF SHAME ✦ FIRST YEAR DIVISION ✦ VERTEX INSTITUTE ✦ REIGNING KING: ${king?.name ?? "???"} ✦ `;
  const ticker = tickerSrc.repeat(6);

  return (
    <View style={s.stage as any}>
      {/* ---- top ticker rail ---- */}
      {web && (
        <View style={s.tickerRail as any} pointerEvents="none">
          <View style={{ flexDirection: "row", width: "200%" } as any}>
            {[0, 1].map((h) => (
              <Text key={h} style={[s.tickerRailTxt as any, { animation: "p5-marquee 28s linear infinite" } as any]}>{ticker}</Text>
            ))}
          </View>
        </View>
      )}

      {/* ---- ambient field ---- */}
      <View style={s.linesWrap as any} pointerEvents="none">
        {[
          { top: "26%", h: 4, dur: "10s", dir: "", col: "rgba(252,238,33,0.07)", d: "0s" },
          { top: "60%", h: 3, dur: "15s", dir: " reverse", col: "rgba(255,255,255,0.05)", d: "1s" },
        ].map((L, i) => (
          <View key={i} style={{ position: "absolute", left: "-20%", right: "-20%", top: L.top, height: L.h, overflow: "hidden" } as any}>
            <View style={{ flexDirection: "row", width: "200%", transform: [{ skewX: "-16deg" }] } as any}>
              {[0, 1].map((half) => (
                <View
                  key={half}
                  style={[
                    { width: "100%", backgroundImage: `repeating-linear-gradient(90deg, ${L.col} 0 52px, transparent 52px 124px)`, height: L.h } as any,
                    web && ({ animation: `p5-marquee${L.dir} ${L.dur} linear infinite`, animationDelay: L.d } as any),
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* ghost 13 */}
      {web && (
        <Text style={s.ghost13 as any} pointerEvents="none">
          13
        </Text>
      )}

      {/* drifting glyphs */}
      {web && (
        <View style={s.driftWrap as any} pointerEvents="none">
          {[
            { ch: "✕", t: "18%", l: "38%", sz: 32, o: 0.09 },
            { ch: "!", t: "74%", l: "6%", sz: 40, o: 0.06 },
            { ch: "?", t: "22%", l: "95%", sz: 36, o: 0.07 },
            { ch: "P", t: "88%", l: "55%", sz: 48, o: 0.04 },
            { ch: "V", t: "8%", l: "72%", sz: 42, o: 0.05 },
          ].map((g, i) => (
            <Text
              key={i}
              style={[
                s.driftGlyph as any,
                { top: g.t, left: g.l, fontSize: g.sz, opacity: g.o } as any,
                { animationDuration: `${4.5 + i}s`, animationDelay: `${-i * 0.9}s` } as any,
              ]}
            >
              {g.ch}
            </Text>
          ))}
        </View>
      )}

      {/* floating diamonds */}
      {web && (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 } as any} pointerEvents="none">
          {[
            { t: "14%", l: "30%", s: 13, d: "0s" },
            { t: "80%", l: "26%", s: 10, d: "1.2s" },
            { t: "18%", l: "97%", s: 14, d: "0.7s" },
            { t: "70%", l: "97%", s: 9, d: "1.8s" },
          ].map((dm, i) => (
            <Text key={i} style={[s.diamond as any, { top: dm.t, left: dm.l, fontSize: dm.s }, { animationDelay: dm.d } as any]}>
              ◆
            </Text>
          ))}
        </View>
      )}

      {/* halftone patches */}
      {web && <View style={[s.halftone as any, { top: "12%", right: "5%" } as any]} pointerEvents="none" />}
      {web && <View style={[s.halftone as any, { bottom: "14%", left: "4%" } as any]} pointerEvents="none" />}

      <P5Back style={{ position: "absolute", top: 48, left: 20, zIndex: 99 } as any} />

      {/* ---- centered composition ---- */}
      <View style={s.center as any}>
        {/* LEFT — vertical ransom letters (options-page style) */}
        <View style={s.titleCol as any}>
          {["H", "A", "L", "L", "O", "F", "S", "H", "A", "M", "E"].map((ch, i) => (
            <View key={i} style={i > 3 && i < 6 ? { paddingLeft: 24 } : null}>
              <Text
                style={[
                  s.vLetter as any,
                  i % 3 === 0 && (s.vLetterC as any),
                  i % 3 === 2 && (s.vLetterY as any),
                  web && ({ animation: `p5-logoLetter 550ms ${i * 55}ms cubic-bezier(0.16,1,0.3,1) both` } as any),
                ]}
              >
                {ch}
              </Text>
            </View>
          ))}
          <View style={s.titleRibbon as any} pointerEvents="none">
            <Text style={s.titleRibbonTxt as any}>FIRST YEAR DIVISION</Text>
          </View>
        </View>

        {/* RIGHT — podium + roster */}
        <View style={s.mainCol as any}>
          {/* starburst behind podium */}
          {web && <View style={s.podiumBurst as any} pointerElements="none" pointerEvents="none" />}

          <View style={s.podium as any}>
            {[
              { r: p2, h: 124, label: "2ND", king: false },
              { r: king, h: 156, label: "1ST — KING", king: true },
              { r: p3, h: 130, label: "3RD", king: false },
            ].map(({ r, h, label, king: isKing }, i) =>
              r ? (
                <View
                  key={label}
                  style={{ position: "relative" } as any}
                  onMouseEnter={() => setHovSlab(i)}
                  onMouseLeave={() => setHovSlab(-1)}
                >
                  {/* medal */}
                  <View
                    style={[
                      s.medalOuter as any,
                      isKing && (s.medalOuterKing as any),
                      hovSlab === i && (s.medalSpin as any),
                      web && ({ transition: "transform 650ms cubic-bezier(0.16,1,0.3,1)" } as any),
                    ]}
                    pointerEvents="none"
                  >
                    <View style={[s.medalInner as any, isKing && (s.medalInnerKing as any)]}>
                      <Text style={[isKing ? s.medalTxt : s.medalNum] as any}>{isKing ? "✦" : String(r.rank)}</Text>
                    </View>
                  </View>
                  {isKing && (
                    <>
                      <View style={[s.ribbonL as any]} pointerEvents="none" />
                      <View style={[s.ribbonR as any]} pointerEvents="none" />
                    </>
                  )}
                  <View
                    style={[
                      s.slab as any,
                      { height: h } as any,
                      isKing && (s.slabKing as any),
                      hovSlab === i && (s.slabHov as any),
                      web && ({ animation: `${isKing ? "p5-kingIn 650ms 520ms" : `p5-slabIn 550ms ${220 + i * 130}ms`} both` } as any),
                    ]}
                  >
                    {/* corner tacks */}
                    <View style={[s.tack as any, { top: 4, left: 4 } as any]} />
                    <View style={[s.tack as any, { top: 4, right: 4 } as any]} />
                    <View style={[s.tack as any, { bottom: 4, left: 4 } as any]} />
                    <View style={[s.tack as any, { bottom: 4, right: 4 } as any]} />
                    {isKing ? (
                      <View style={s.kingChip as any}>
                        <Text style={s.kingChipTxt as any}>1ST — KING</Text>
                      </View>
                    ) : (
                      <Text style={s.slabRank as any}>{label}</Text>
                    )}
                    <Text style={s.slabName as any} numberOfLines={1}>
                      {r.name}
                    </Text>
                  <Text style={s.slabScore as any}>{r.losses} LOSSES</Text>
                  </View>
                </View>
              ) : null
            )}
          </View>

          {/* roster */}
          <ScrollView style={s.roster as any} contentContainerStyle={{ gap: 9, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
            {rest.map((r, i) => (
              <Pressable
                key={r.rank}
                onHoverIn={playHover}
                style={({ hovered }) => [
                  s.row as any,
                  r.isMe && (s.rowMe as any),
                  hovered && (s.rowHov as any),
                  web && ({ animation: `p5-rowSlide 380ms ${420 + i * 40}ms both` } as any),
                ]}
              >
                {({ hovered }) => (
                  <>
                    <View style={[s.rankBox as any, hovered && (s.rankBoxHov as any)]}>
                      <Text style={[s.rankTxt as any, hovered && (s.rankTxtHov as any)]}>{String(r.rank).padStart(2, "0")}</Text>
                    </View>
                    <View style={{ flex: 1 } as any}>
                      <Text style={[s.rowName as any, hovered && (s.rowNameHov as any)]}>
                        {r.name}
                        {r.isNpc ? <Text style={s.npcTag}> — NPC</Text> : null}
                        {r.isMe ? <Text style={s.meTag}> ← YOU</Text> : null}
                      </Text>
                      <Text style={s.rowStats as any}>{r.wins} WINS · {r.draws} DRAWS · RATE {r.winRate}%</Text>
                    </View>
                    <View style={s.scoreCol as any}>
                      <Text style={s.score as any}>{r.losses}</Text>
                      <Text style={s.scoreLbl as any}>LOSSES</Text>
                    </View>
                    {/* yellow sweep wipe */}
                    {hovered && web ? <View style={s.rowSweep as any} pointerEvents="none" /> : null}
                  </>
                )}
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

  /* ticker rail */
  tickerRail: { position: "absolute", top: 0, left: 0, right: 0, height: 30, backgroundColor: theme.color.crimson, borderBottomWidth: 3, borderBottomColor: theme.color.black, overflow: "hidden", flexDirection: "row", alignItems: "center", zIndex: 9 } as any,
  tickerRailTxt: { fontFamily: theme.font.body, fontSize: 13, fontWeight: "800", letterSpacing: 3, color: theme.color.paper, paddingRight: 40, whiteSpace: "nowrap" } as any,

  /* ambient */
  linesWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1 } as any,
  ghost13: {
    position: "absolute",
    right: "2%",
    bottom: "-6%",
    fontFamily: theme.font.display,
    fontSize: 420,
    lineHeight: 400,
    color: "transparent",
    ...(web ? ({ WebkitTextStroke: "3px rgba(252,238,33,0.10)" } as any) : {}),
    animation: "p5-float 7s ease-in-out infinite",
    zIndex: 0,
  } as any,
  driftWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1 } as any,
  driftGlyph: {
    position: "absolute",
    fontFamily: theme.font.display,
    color: theme.color.crimson,
    textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    animation: "p5-float 5s ease-in-out infinite",
  } as any,
  diamond: {
    position: "absolute",
    color: theme.color.yellow,
    textShadow: "2px 2px 0 rgba(0,0,0,0.55)",
    animation: "p5-float 3.6s ease-in-out infinite",
  } as any,
  halftone: {
    position: "absolute",
    width: 180,
    height: 110,
    opacity: 0.09,
    backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)",
    backgroundSize: "12px 12px",
    transform: [{ skewX: "-10deg" }, { rotate: "3deg" }],
    zIndex: 1,
  } as any,
  tapeWrap: { position: "absolute", bottom: 0, left: 0, right: 0, overflow: "hidden", zIndex: 8 } as any,

  /* centered composition */
  center: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "stretch", gap: 40, paddingHorizontal: "4%", paddingTop: 118, paddingBottom: 40, zIndex: 3 } as any,

  titleCol: { width: 104 } as any,
  vLetter: { fontFamily: theme.font.display, fontSize: 52, lineHeight: 56, color: theme.color.paper, textShadow: `3px 3px 0 ${theme.color.crimson}`, textAlign: "center" } as any,
  vLetterC: { color: theme.color.crimson, textShadow: `3px 3px 0 ${theme.color.paper}` } as any,
  vLetterY: { color: theme.color.yellow, textShadow: `3px 3px 0 ${theme.color.black}` } as any,
  titleRibbon: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: theme.color.yellow,
    borderWidth: 3,
    borderColor: theme.color.black,
    paddingVertical: 6,
    paddingHorizontal: 12,
    transform: [{ rotate: "-4deg" }, { skewX: "-6deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
  } as any,
  titleRibbonTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, fontWeight: "900", color: theme.color.black } as any,

  mainCol: {
    flex: 1,
    maxWidth: 980,
    // stretch to container height so the ScrollView is bounded and scrolls
    // internally; margin auto centers it in the leftover space
    marginLeft: "auto",
    marginRight: "auto",
  } as any,
  podiumBurst: {
    position: "absolute",
    top: -70,
    left: "50%",
    width: 430,
    height: 430,
    marginLeft: -215,
    opacity: 0.09,
    backgroundColor: theme.color.crimson,
    borderRadius: 16,
    transform: [{ rotate: "45deg" }],
    backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.55) 0deg 5deg, transparent 5deg 11deg)",
    animation: "p5-spinRev 30s linear infinite",
    zIndex: 0,
  } as any,
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 16, justifyContent: "center", marginBottom: 16, position: "relative", zIndex: 2 } as any,

  medalOuter: {
    position: "absolute",
    top: -16,
    left: -12,
    width: 42,
    height: 46,
    backgroundColor: "#2b2b2b",
    clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
    transform: [{ rotate: "-10deg" }],
    zIndex: 6,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  medalOuterKing: { backgroundColor: theme.color.yellow, width: 50, height: 54, top: -20, left: -14, borderWidth: 0 } as any,
  medalInner: {
    width: 34,
    height: 38,
    backgroundColor: "#000",
    clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
    alignItems: "center",
    justifyContent: "center",
  } as any,
  medalInnerKing: { width: 40, height: 44, backgroundColor: theme.color.crimson } as any,
  medalTxt: { fontFamily: theme.font.display, fontSize: 16, color: theme.color.paper, marginBottom: 2 } as any,
  medalNum: { fontFamily: theme.font.body, fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.75)", marginBottom: 1 } as any,
  medalSpin: { transform: [{ rotate: "350deg" }] } as any,
  slabHov: { transform: [{ skewX: "-4deg" }, { translateY: -7 }], borderColor: theme.color.paper, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 0, shadowOffset: { width: 10, height: 10 } } as any,

  ribbonL: {
    position: "absolute",
    bottom: -12,
    left: 22,
    width: 22,
    height: 30,
    backgroundColor: theme.color.crimson,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.color.black,
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 74%, 0% 100%)",
    transform: [{ rotate: "18deg" }],
    zIndex: 4,
  } as any,
  ribbonR: {
    position: "absolute",
    bottom: -12,
    right: 22,
    width: 22,
    height: 30,
    backgroundColor: theme.color.crimson,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.color.black,
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 74%, 0% 100%)",
    transform: [{ rotate: "-18deg" }],
    zIndex: 4,
  } as any,

  slab: {
    width: 268,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2b2b2b",
    borderBottomWidth: 7,
    borderBottomColor: theme.color.crimson,
    transform: [{ skewX: "-4deg" }],
    paddingVertical: 14,
    paddingLeft: 22,
    paddingRight: 16,
  } as any,
  slabKing: {
    backgroundColor: theme.color.crimson,
    borderColor: theme.color.paper,
    borderBottomColor: theme.color.yellow,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 0,
    shadowOffset: { width: 9, height: 9 },
  } as any,
  tack: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.65)" } as any,
  slabRank: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: "rgba(255,255,255,0.55)", fontWeight: "800" } as any,
  kingChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.color.yellow,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 9,
    paddingVertical: 3,
    transform: [{ rotate: "-2deg" }],
    marginBottom: 5,
  } as any,
  kingChipTxt: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, fontWeight: "900", color: theme.color.black } as any,
  slabName: { fontFamily: theme.font.display, fontSize: 22, color: theme.color.paper, marginTop: 5 } as any,
  slabScore: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 2, color: "rgba(255,255,255,0.55)", marginTop: 4 } as any,

  roster: { flex: 1 } as any,
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2b2b2b",
    borderLeftWidth: 8,
    borderLeftColor: theme.color.crimson,
    paddingVertical: 14,
    paddingHorizontal: 18,
    transform: [{ skewX: "-3deg" }],
  } as any,
  rowMe: { backgroundColor: "#241a00", borderColor: theme.color.yellow, borderLeftColor: theme.color.yellow } as any,
  rowHov: { transform: [{ skewX: "-3deg" }, { translateX: 9 }], borderColor: theme.color.paper } as any,
  rankBox: { width: 54, height: 54, alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.crimson, transform: [{ skewX: "6deg" }] } as any,
  rankTxt: { fontFamily: theme.font.display, fontSize: 23, color: theme.color.paper } as any,
  rankBoxHov: { backgroundColor: theme.color.yellow, borderColor: theme.color.black } as any,
  rankTxtHov: { color: theme.color.black } as any,
  rowNameHov: { textShadow: `3px 3px 0 ${theme.color.crimson}` } as any,
  rowSweep: { position: "absolute", bottom: 0, left: "4%", right: "4%", height: 5, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }], animation: "p5-sweep 320ms cubic-bezier(0.16,1,0.3,1) both" } as any,
  rowName: { fontFamily: theme.font.body, fontSize: 19, fontWeight: "900", color: theme.color.paper, letterSpacing: 2 } as any,
  npcTag: { fontSize: 12.5, color: "rgba(255,255,255,0.35)", letterSpacing: 1 } as any,
  meTag: { fontSize: 14, color: theme.color.yellow, fontWeight: "800" } as any,
  rowStats: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 2.5, color: "rgba(255,255,255,0.45)", marginTop: 3 } as any,
  scoreCol: { alignItems: "flex-end", minWidth: 74 } as any,
  score: { fontFamily: theme.font.display, fontSize: 36, lineHeight: 38, color: theme.color.crimson } as any,
  scoreLbl: { fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 3, color: "rgba(255,255,255,0.4)" } as any,
  foot: { marginTop: 12, textAlign: "center", fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.35)", paddingBottom: 4 } as any,
});
