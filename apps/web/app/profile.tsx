/* PROFILE — LOCKED DESIGN: C "REPORT CARD" (paper poster, ransom name,
   ink-stamped grades, class of thirteen, tear-off logout stub).
   Reads ONLY from the client store — the DB was fetched once at /load. */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect } from "react";
import { router, useRootNavigationState } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useGame } from "../lib/game";
import { api } from "../lib/api";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

/* identity badge — how the academy knows your name */
function idBadge(nameSource: string | null) {
  if (nameSource === "google") return { txt: "VERIFIED STUDENT", color: theme.color.yellow };
  if (nameSource === "email") return { txt: "ENROLLED", color: theme.color.black };
  return { txt: "SELF-DECLARED", color: theme.color.crimson };
}

export default function Profile() {
  const { profile, clearProfile } = useGame();
  const navReady = useRootNavigationState();

  // cold start (F5 deep-link) — store is empty, bounce to the flow's entrance
  // (only once the root navigator has actually mounted)
  useEffect(() => {
    if (!profile && navReady?.key) router.replace("/");
  }, [profile, navReady?.key]);

  if (!profile) return <View style={s.stage as any} />;

  const p = profile;
  const name = p.username ?? "GUEST";
  const badge = idBadge(p.nameSource);

  async function logout() {
    try {
      await api("/auth/logout", {});
    } catch {}
    clearProfile(); // wipe client data — next login refetches via /load
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
    { k: "BEST STREAK", v: String(p.streak), g: grade(p.streak, 3) },
    { k: "COINS EARNED", v: String(p.coins), g: grade(p.coins, 100) },
    { k: "ENROLLED SINCE", v: fmtDate(p.memberSince), g: "★" },
  ];

  return (
    <View style={s.stage as any}>
      {/* back to menu */}
      <Pressable onPress={() => router.push("/menu")} style={({ hovered }) => [s.backBtn as any, hovered && (s.chipHover as any)]}>
        <Text style={s.backTxt as any}>◀ MENU</Text>
      </Pressable>

      <View style={[s.card as any, web && ({ animation: "jokerIn 550ms 100ms both" } as any)]}>
        {/* stamp varies by identity source */}
        <View style={s.stampIdleW as any} pointerEvents="none">
          <View style={[s.stamp as any, web && ({ animation: "p5-slam 450ms 650ms both" } as any)]}>
            <Text style={[s.stampTxt as any, badge.color === theme.color.yellow && { color: "#8a6d00" }] as any}>{badge.txt}</Text>
          </View>
        </View>

        <Text style={s.kicker as any}>PACIFY ACADEMY — TERM 01</Text>
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

        {/* class of thirteen */}
        <View style={{ marginTop: 18 } as any}>
          <Text style={s.seatLabel as any}>CLASS OF THIRTEEN — PACIFIED {p.pacified}/13</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" } as any}>
            {Array.from({ length: 13 }).map((_, i) => (
              <View key={i} style={[s.seat as any, i < p.pacified && (s.seatOn as any)]}>
                <Text style={[s.seatTxt as any, i < p.pacified && { color: theme.color.paper } as any]}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* tear-off logout stub */}
        <Pressable
          onPress={logout}
          style={({ hovered }) => [s.stub as any, hovered && (s.stubHover as any)]}
        >
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

  backBtn: { position: "absolute", top: 16, left: 16, zIndex: 99, backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black, paddingVertical: 8, paddingHorizontal: 14, transform: [{ skewX: "-8deg" }] } as any,
  chipHover: { backgroundColor: theme.color.yellow } as any,
  backTxt: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 2, color: theme.color.black, fontWeight: "800" } as any,

  card: { width: "min(94%, 720px)", maxHeight: "94%", backgroundColor: theme.color.paper, borderWidth: 4, borderColor: theme.color.black, outlineStyle: "solid", outlineWidth: 2, outlineOffset: 6, outlineColor: theme.color.black, paddingVertical: 26, paddingHorizontal: 32, transform: [{ rotate: "-1.2deg" }, { skewX: "-1deg" }], shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 0, shadowOffset: { width: 14, height: 14 } } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 5, color: "#888", fontWeight: "800" } as any,
  title: { fontFamily: theme.font.display, fontSize: 64, lineHeight: 70, color: theme.color.black, letterSpacing: 1 } as any,

  stampIdleW: { position: "absolute", top: -14, right: -18, zIndex: 7, ...(web ? ({ animation: "p5-stampIdle 6s ease-in-out infinite" } as any) : {}) } as any,
  stamp: { backgroundColor: "#fffdf5", borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "6deg" }] } as any,
  stampTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: theme.color.crimson, fontWeight: "800" } as any,

  box: { minWidth: 54, height: 66, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: theme.color.black, backgroundColor: "#fff" } as any,
  boxCrimson: { backgroundColor: theme.color.crimson } as any,
  boxYellow: { backgroundColor: theme.color.yellow } as any,
  boxTxt: { fontFamily: theme.font.display, fontSize: 42, lineHeight: 48, color: theme.color.black } as any,

  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#e2ddd2", paddingVertical: 9, gap: 12 } as any,
  rowKey: { flex: 1, fontFamily: theme.font.body, fontSize: 15, letterSpacing: 3, color: "#333", fontWeight: "800" } as any,
  rowVal: { fontFamily: theme.font.body, fontSize: 19, color: theme.color.black, fontWeight: "800" } as any,
  rowGrade: { width: 56, textAlign: "center", fontFamily: theme.font.display, fontSize: 30, color: theme.color.crimson, transform: [{ rotate: "-6deg" }] } as any,

  seatLabel: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 4, color: theme.color.yellow === "#FCEE21" ? "#8a6d00" : "#8a6d00", fontWeight: "800", marginBottom: 8 } as any,
  seat: { minWidth: 34, height: 42, borderWidth: 2, borderColor: "#cfc7ba", backgroundColor: "#faf7f0", alignItems: "center", justifyContent: "center" } as any,
  seatOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.black } as any,
  seatTxt: { fontFamily: theme.font.body, fontSize: 15, color: "#999", fontWeight: "800" } as any,

  stub: { alignSelf: "stretch", marginTop: 22, marginHorizontal: -32, marginBottom: -26, borderTopWidth: 3, borderTopColor: theme.color.black, borderStyle: "dashed", paddingVertical: 14, alignItems: "center", backgroundColor: "#f3efe6" } as any,
  stubHover: { backgroundColor: theme.color.yellow } as any,
  stubDash: { fontFamily: theme.font.body, fontSize: 12, color: "#aaa", letterSpacing: 2 } as any,
  stubTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 2, color: theme.color.crimson, marginTop: 4 } as any,
});
