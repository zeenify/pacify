/* PROFILE — Report Card of the Vertex Institute, floating in a living page:
   ghost institute lettering, spinning ring + starburst, floating diamonds,
   halftone patch, and a data ticker along the floor. Reads ONLY from the
   client store (DB fetched once at /load). */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useRef } from "react";
import { router, useRootNavigationState } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useGame } from "../lib/game";
import { api } from "../lib/api";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

/* identity badge — how the institute knows your name */
function idBadge(nameSource: string | null) {
  if (nameSource === "google") return { txt: "VERIFIED STUDENT", color: theme.color.yellow };
  if (nameSource === "email") return { txt: "ENROLLED", color: theme.color.black };
  return { txt: "SELF-DECLARED", color: theme.color.crimson };
}

export default function Profile() {
  const { profile, clearProfile, refreshProfile } = useGame();
  const navReady = useRootNavigationState();
  const triedRef = useRef(false);

  // Cold start (F5): session cache usually refills instantly. If it's somehow
  // empty, refill SILENTLY right here — never bounce the user through Load.
  // Only a genuinely dead session goes back to the gate.
  useEffect(() => {
    if (profile || triedRef.current || !navReady?.key) return;
    triedRef.current = true;
    refreshProfile().catch(() => {
      router.replace("/");
    });
  }, [profile, navReady?.key]);

  if (!profile) return <View style={s.stage as any} />;

  const p = profile;
  const name = p.username ?? "GUEST";
  const badge = idBadge(p.nameSource);
  const tickerSrc = `VERTEX INSTITUTE ✦ FIRST YEAR DIVISION ✦ THE TOP 13 ✦ PACIFIED ${p.pacified}/13 ✦ ${name} ✦ ${p.wins}W / ${p.losses}L ✦ WIN RATE ${p.winRate}% ✦ `;
  const ticker = tickerSrc.repeat(4);

  async function logout() {
    try {
      await api("/auth/logout", {});
    } catch {}
    clearProfile();
    router.replace("/");
  }

  const chars = name.split("").slice(0, 14);
  const boxRows: string[][] = [];
  for (let i = 0; i < chars.length; i += 7) boxRows.push(chars.slice(i, i + 7));

  const grade = (v: number, good = 5) => (v <= 0 ? "—" : v >= good ? "A+" : v >= Math.ceil(good / 2) ? "B" : "C");
  const rows: { k: string; v: string; g: string }[] = [
    { k: "CAMPAIGNS PLAYED", v: String(p.played), g: grade(p.played, 13) },
    { k: "VICTORIES", v: String(p.wins), g: grade(p.wins) },
    { k: "DEFEATS", v: String(p.losses), g: p.losses > 0 ? "C" : "A" },
    { k: "DRAWS", v: String(p.draws), g: p.draws > 0 ? "B" : "—" },
    { k: "BEST STREAK", v: String(p.streak), g: grade(p.streak, 3) },
    { k: "WIN RATE", v: `${p.winRate}%`, g: grade(Math.round((p.winRate / 100) * 10), 7) },
    { k: "ENROLLED SINCE", v: fmtDate(p.memberSince), g: "★" },
  ];

  return (
    <View style={s.stage as any}>
      {/* ---- environment ---- */}
      <View style={s.envSlashL as any} pointerEvents="none">
        <View style={[s.envSlashLIn as any, web && ({ animation: "p5-slashA 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>
      <View style={s.envSlashR as any} pointerEvents="none">
        <View style={[s.envSlashRIn as any, web && ({ animation: "p5-slashB 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>

      {/* ghost institute lettering behind everything */}
      <View style={s.ghostWrap as any} pointerEvents="none">
        <Text style={s.ghostLine as any}>VERTEX</Text>
        <Text style={s.ghostLine2 as any}>INSTITUTE</Text>
      </View>

      {/* spinning ring left */}
      {web && (
        <View style={s.ringW as any} pointerEvents="none">
          <View style={s.ring as any} />
          <Text style={s.ringStar as any}>✦</Text>
        </View>
      )}
      {/* starburst right */}
      {web && <View style={s.burst as any} pointerEvents="none" />}

      {/* floating diamonds */}
      {web && (
        <View style={s.diamonds as any} pointerEvents="none">
          {[
            { t: "12%", l: "6%", s: 16, d: "0s" },
            { t: "70%", l: "10%", s: 11, d: "0.8s" },
            { t: "18%", l: "88%", s: 13, d: "1.5s" },
            { t: "78%", l: "86%", s: 17, d: "0.4s" },
            { t: "45%", l: "94%", s: 9, d: "2s" },
          ].map((dm, i) => (
            <Text key={i} style={[s.diamond as any, { top: dm.t, left: dm.l, fontSize: dm.s }, { animationDelay: dm.d } as any]}>
              ◆
            </Text>
          ))}
        </View>
      )}

      {/* halftone patch top-right */}
      {web && <View style={s.halftone as any} pointerEvents="none" />}

      {/* data ticker along the floor */}
      {web && (
        <View style={s.tickerWrap as any} pointerEvents="none">
          <Text style={[s.tickerTxt as any, { animation: "p5-marquee 26s linear infinite" } as any]}>{ticker}</Text>
          <Text style={[s.tickerTxt as any, { animation: "p5-marquee 26s linear infinite" } as any]}>{ticker}</Text>
        </View>
      )}

      {/* ---- the button ---- */}
      <P5Back style={{ position: "absolute", top: 20, left: 20 } as any} />

      {/* ---- the report card ---- */}
      <View style={[s.card as any, web && ({ animation: "jokerIn 550ms 100ms both" } as any)]}>
        <View style={s.stampIdleW as any} pointerEvents="none">
          <View style={[s.stamp as any, web && ({ animation: "p5-slam 450ms 650ms both" } as any)]}>
            <Text style={[s.stampTxt as any, badge.color === theme.color.yellow && { color: "#8a6d00" }] as any}>{badge.txt}</Text>
          </View>
        </View>

        <Text style={s.kicker as any}>VERTEX INSTITUTE — FIRST YEAR DIVISION</Text>
        <Text style={s.title as any}>REPORT CARD</Text>

        {/* ransom name */}
        <View style={{ marginTop: 14, gap: 6 } as any}>
          {boxRows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 6 } as any}>
              {row.map((ch, i) => {
                const gi = r * 7 + i;
                const boxed = gi % 3 === 0;
                const yellowed = gi % 3 === 2;
                return (
                  <View
                    key={i}
                    style={[
                      s.box as any,
                      boxed && (s.boxCrimson as any),
                      yellowed && (s.boxYellow as any),
                      web && ({ animation: `heroIn 420ms ${250 + gi * 45}ms both` } as any),
                    ]}
                  >
                    <Text style={[s.boxTxt as any, boxed && { color: theme.color.paper } as any]}>{ch}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ink rows */}
        <View style={{ marginTop: 20, borderTopWidth: 3, borderTopColor: theme.color.black } as any}>
          {rows.map((r, i) => (
            <View key={r.k} style={[s.row as any, web && ({ animation: `rowIn 400ms ${500 + i * 80}ms both` } as any)]}>
              <Text style={s.rowKey as any}>{r.k}</Text>
              <Text style={s.rowVal as any}>{r.v}</Text>
              <Text style={s.rowGrade as any}>{r.g}</Text>
            </View>
          ))}
        </View>

        {/* the top 13 */}
        <View style={{ marginTop: 18 } as any}>
          <Text style={s.seatLabel as any}>THE TOP 13 — PACIFIED {p.pacified}/13</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" } as any}>
            {Array.from({ length: 13 }).map((_, i) => (
              <View key={i} style={[s.seat as any, i < p.pacified && (s.seatOn as any)]}>
                <Text style={[s.seatTxt as any, i < p.pacified && { color: theme.color.paper } as any]}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* tear-off logout stub */}
        <Pressable onPress={logout} style={({ hovered }) => [s.stub as any, hovered && (s.stubHover as any)]}>
          <Text style={s.stubDash as any}>✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</Text>
          <Text style={s.stubTxt as any}>TEAR HERE TO LOG OUT ▶</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,

  /* environment */
  envSlashL: { position: "absolute", top: "-10%", left: "-5%", width: "34%", height: "120%", transform: [{ skewX: "-18deg" }], overflow: "hidden" } as any,
  envSlashLIn: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson, opacity: 0.1 } as any,
  envSlashR: { position: "absolute", top: "-10%", right: "-6%", width: "26%", height: "120%", transform: [{ skewX: "16deg" }], overflow: "hidden" } as any,
  envSlashRIn: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimsonDeep, opacity: 0.09 } as any,
  ghostWrap: { position: "absolute", top: "6%", right: "4%", alignItems: "flex-end", opacity: 0.055, transform: [{ skewX: "-6deg" }] } as any,
  ghostLine: { fontFamily: theme.font.display, fontSize: 130, lineHeight: 118, color: theme.color.paper, letterSpacing: 4 } as any,
  ghostLine2: { fontFamily: theme.font.display, fontSize: 92, lineHeight: 92, color: theme.color.crimson, letterSpacing: 10 } as any,
  ringW: { position: "absolute", left: "-7%", top: "16%", width: 360, height: 360, alignItems: "center", justifyContent: "center" } as any,
  ring: { width: 320, height: 320, borderRadius: 160, borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(252,238,33,0.35)", animation: "p5-spin 30s linear infinite" } as any,
  ringStar: { position: "absolute", top: -14, fontFamily: theme.font.display, fontSize: 26, color: theme.color.yellow, textShadow: "2px 2px 0 rgba(0,0,0,0.6)" } as any,
  burst: {
    position: "absolute",
    right: "-9%",
    top: "52%",
    width: 460,
    height: 460,
    marginTop: -230,
    opacity: 0.13,
    backgroundColor: theme.color.crimson,
    borderRadius: 18,
    transform: [{ rotate: "45deg" }],
    backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.55) 0deg 5deg, transparent 5deg 11deg)",
    animation: "p5-spinRev 22s linear infinite",
  } as any,
  diamonds: { ...StyleSheet.absoluteFillObject } as any,
  diamond: {
    position: "absolute",
    color: theme.color.yellow,
    textShadow: "2px 2px 0 rgba(0,0,0,0.55)",
    animation: "p5-float 3.4s ease-in-out infinite",
  } as any,
  halftone: {
    position: "absolute",
    top: "8%",
    left: "58%",
    width: 220,
    height: 150,
    opacity: 0.1,
    backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)",
    backgroundSize: "12px 12px",
    transform: [{ skewX: "-10deg" }, { rotate: "3deg" }],
  } as any,
  tickerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: theme.color.crimson,
    borderTopWidth: 3,
    borderTopColor: theme.color.black,
    overflow: "hidden",
    flexDirection: "row",
    width: "200%",
    alignItems: "center",
    zIndex: 5,
  } as any,
  tickerTxt: { fontFamily: theme.font.body, fontSize: 15, fontWeight: "800", letterSpacing: 3, color: theme.color.paper, paddingRight: 48, whiteSpace: "nowrap" } as any,

  /* card */
  card: { width: "min(94%, 700px)", maxHeight: "88%", marginBottom: 30, backgroundColor: theme.color.paper, borderWidth: 4, borderColor: theme.color.black, outlineStyle: "solid", outlineWidth: 2, outlineOffset: 6, outlineColor: theme.color.black, paddingVertical: 24, paddingHorizontal: 32, transform: [{ rotate: "-1.2deg" }, { skewX: "-1deg" }], shadowColor: "#000", shadowOpacity: 0.65, shadowRadius: 0, shadowOffset: { width: 14, height: 14 } } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 5, color: "#888", fontWeight: "800" } as any,
  title: { fontFamily: theme.font.display, fontSize: 60, lineHeight: 66, color: theme.color.black, letterSpacing: 1 } as any,

  stampIdleW: { position: "absolute", top: -14, right: -18, zIndex: 7, ...(web ? ({ animation: "p5-stampIdle 6s ease-in-out infinite" } as any) : {}) } as any,
  stamp: { backgroundColor: "#fffdf5", borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "6deg" }] } as any,
  stampTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: theme.color.crimson, fontWeight: "800" } as any,

  box: { minWidth: 50, height: 62, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: theme.color.black, backgroundColor: "#fff" } as any,
  boxCrimson: { backgroundColor: theme.color.crimson } as any,
  boxYellow: { backgroundColor: theme.color.yellow } as any,
  boxTxt: { fontFamily: theme.font.display, fontSize: 38, lineHeight: 44, color: theme.color.black } as any,

  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#e2ddd2", paddingVertical: 8, gap: 12 } as any,
  rowKey: { flex: 1, fontFamily: theme.font.body, fontSize: 14.5, letterSpacing: 3, color: "#333", fontWeight: "800" } as any,
  rowVal: { fontFamily: theme.font.body, fontSize: 18, color: theme.color.black, fontWeight: "800" } as any,
  rowGrade: { width: 54, textAlign: "center", fontFamily: theme.font.display, fontSize: 28, color: theme.color.crimson, transform: [{ rotate: "-6deg" }] } as any,

  seatLabel: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 4, color: "#a09480", fontWeight: "800" } as any,
  seat: { minWidth: 33, height: 41, borderWidth: 2, borderColor: "#cfc7ba", backgroundColor: "#faf7f0", alignItems: "center", justifyContent: "center" } as any,
  seatOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.black } as any,
  seatTxt: { fontFamily: theme.font.body, fontSize: 14, color: "#999", fontWeight: "800" } as any,

  stub: { alignSelf: "stretch", marginTop: 20, marginHorizontal: -32, marginBottom: -24, borderTopWidth: 3, borderTopColor: theme.color.black, borderStyle: "dashed", paddingVertical: 13, alignItems: "center", backgroundColor: "#f3efe6" } as any,
  stubHover: { backgroundColor: theme.color.yellow } as any,
  stubDash: { fontFamily: theme.font.body, fontSize: 12, color: "#aaa", letterSpacing: 2 } as any,
  stubTxt: { fontFamily: theme.font.display, fontSize: 19, letterSpacing: 2, color: theme.color.crimson, marginTop: 4 } as any,
});
