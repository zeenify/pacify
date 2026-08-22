import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { WedgeButton, theme } from "@pacify/ui-kit";

const NAV = [
  { n: "01", label: "CAMPAIGN", sub: "face all 13 • ladder", to: "/campaign", variant: "primary" as const, size: "hero" as const },
  { n: "02", label: "DOSSIER", sub: "psych profiles • tells", to: "/dossier", variant: "ghost" as const, size: "lg" as const },
  { n: "03", label: "HALL OF SHAME", sub: "your worst losses, framed", to: "/shame", variant: "ghost" as const, size: "lg" as const },
  { n: "04", label: "MULTIPLAYER", sub: "soon", to: null, variant: "locked" as const, size: "lg" as const },
];

const UTIL = [
  { label: "PROFILE", to: "/profile" },
  { label: "HOW TO PLAY", to: "/howto" },
  { label: "OPTIONS", to: "/options" },
];

const DESIGNS = [
  { key: 1, label: "B" },
  { key: 2, label: "C" },
  { key: 3, label: "D" },
  { key: 4, label: "E" },
  { key: 5, label: "F" },
];

export default function Menu() {
  const [v, setV] = useState<number>(1);
  return (
    <View style={s.stage as any}>
      {v === 1 && <DesignB />}
      {v === 2 && <DesignC />}
      {v === 3 && <DesignD />}
      {v === 4 && <DesignE />}
      {v === 5 && <DesignF />}

      {/* TEMP picker — remove after a design is chosen */}
      <View style={s.picker as any}>
        <Text style={s.pickerLabel as any}>PICK DESIGN</Text>
        {DESIGNS.map((d) => (
          <Pressable key={d.key} onPress={() => setV(d.key)} style={[s.pickBtn as any, v === d.key && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ====================== DESIGN B — BOLD TYPOGRAPHIC ====================== */
function DesignB() {
  return (
    <View style={s.stage as any}>
      <View style={s.bRed as any} pointerEvents="none" />
      <View style={s.slashR as any} pointerEvents="none" />
      <View style={s.frame as any}>
        <View style={s.bHead as any}>
          <Text style={s.logo as any}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={s.bList as any}>
          {NAV.map((it) => (
            <Pressable
              key={it.label}
              disabled={!it.to}
              onPress={it.to ? () => router.push(it.to as string) : undefined}
              style={({ hovered }) => [s.bWord as any, hovered && !it.to && ({} as any), hovered && it.to && (s.bWordHover as any)]}
            >
              {({ hovered }) => (
                <View style={s.bWordInner as any}>
                  <Text style={[s.bIndex as any, hovered && (s.bIndexOn as any)]}>{it.n}</Text>
                  <Text style={[s.bWordText as any, hovered && it.to && { color: theme.color.crimson } as any, !it.to && { opacity: 0.4 } as any]}>
                    {it.label}
                  </Text>
                  {!it.to && <Text style={s.bSoon as any}>SOON</Text>}
                  {hovered && it.to && <View style={s.bUnderline as any} />}
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={s.bFoot as any}>
          {UTIL.map((u) => (
            <WedgeButton key={u.label} label={u.label} size="md" variant="ghost" onPress={() => router.push(u.to)} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ====================== DESIGN C — ARCADE TICKETS ====================== */
function DesignC() {
  return (
    <View style={s.stage as any}>
      <View style={s.cBand as any} pointerEvents="none" />
      <View style={s.slashL as any} pointerEvents="none" />
      <Text style={[s.cGhost, Platform.OS === "web" && ({ animation: "p5-float 5s ease-in-out infinite" } as any)] as any} pointerEvents="none">
        P
      </Text>

      <View style={s.frame as any}>
        <View style={s.cHead as any}>
          <Text style={[s.logo, Platform.OS === "web" && ({ animation: "heroIn 560ms 100ms both" } as any)] as any}>PACIFY</Text>
          <Text style={s.kicker as any}>REBELLION // BUILD 0.1</Text>
        </View>

        <View style={s.cList as any}>
          {NAV.map((it, i) => (
            <View
              key={it.label}
              style={[
                s.ticket as any,
                Platform.OS === "web" && ({ animation: `rowIn 600ms ${120 + i * 80}ms both` } as any),
              ]}
            >
              <WedgeButton
                indexLabel={it.n}
                label={it.label}
                sub={it.sub}
                variant={it.variant}
                size={it.size === "hero" ? "lg" : it.size}
                onPress={it.to ? () => router.push(it.to as string) : undefined}
              />
            </View>
          ))}
        </View>

        <View style={s.utilRow as any}>
          {UTIL.map((u) => (
            <WedgeButton key={u.label} label={u.label} size="md" variant="ghost" onPress={() => router.push(u.to)} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ============ DESIGN D — TYPOGRAPHIC + ARCADE MIX (B words + C band/ghost) ============ */
function DesignD() {
  return (
    <View style={s.stage as any}>
      <View style={s.bRed as any} pointerEvents="none" />
      <View style={s.cBand as any} pointerEvents="none" />
      <Text style={[s.cGhost, Platform.OS === "web" && ({ animation: "p5-float 5s ease-in-out infinite" } as any)] as any} pointerEvents="none">
        P
      </Text>

      <View style={s.frame as any}>
        <View style={s.bHead as any}>
          <Text style={s.logo as any}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={s.bList as any}>
          {NAV.map((it) => (
            <Pressable
              key={it.label}
              disabled={!it.to}
              onPress={it.to ? () => router.push(it.to as string) : undefined}
              style={({ hovered }) => [s.bWord as any, hovered && it.to && (s.bWordHover as any)]}
            >
              {({ hovered }) => (
                <View style={s.bWordInner as any}>
                  <Text style={[s.bIndex as any, hovered && (s.bIndexOn as any)]}>{it.n}</Text>
                  <Text style={[s.bWordText as any, hovered && it.to && { color: theme.color.crimson } as any, !it.to && { opacity: 0.4 } as any]}>
                    {it.label}
                  </Text>
                  {!it.to && <Text style={s.bSoon as any}>SOON</Text>}
                  {hovered && it.to && <View style={s.bUnderline as any} />}
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={s.bFoot as any}>
          {UTIL.map((u) => (
            <WedgeButton key={u.label} label={u.label} size="md" variant="ghost" onPress={() => router.push(u.to)} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ====================== DESIGN E — SPLIT STAGE ====================== */
function DesignE() {
  return (
    <View style={s.stage as any}>
      <View style={s.eRed as any} pointerEvents="none" />
      <View style={s.frame as any}>
        <View style={s.eCols as any}>
          <View style={s.eLeft as any}>
            <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
            <View style={s.bList as any}>
              {NAV.map((it) => (
                <Pressable
                  key={it.label}
                  disabled={!it.to}
                  onPress={it.to ? () => router.push(it.to as string) : undefined}
                  style={({ hovered }) => [s.bWord as any, s.bWordLight as any, hovered && it.to && (s.bWordHover as any)]}
                >
                  {({ hovered }) => (
                    <View style={s.bWordInner as any}>
                      <Text style={[s.bIndex as any, hovered && (s.bIndexOn as any)]}>{it.n}</Text>
                      <Text style={[s.bWordText as any, hovered && it.to && { color: theme.color.yellow } as any, !it.to && { opacity: 0.4 } as any]}>
                        {it.label}
                      </Text>
                      {!it.to && <Text style={s.bSoon as any}>SOON</Text>}
                      {hovered && it.to && <View style={s.bUnderline as any} />}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.eRight as any}>
            <Text style={s.eTag as any}>{"13 SEATS.\nHARD FROM 01."}</Text>
            <View style={s.utilRow as any}>
              {UTIL.map((u) => (
                <WedgeButton key={u.label} label={u.label} size="md" variant="ghost" onPress={() => router.push(u.to)} />
              ))}
            </View>
            <View style={s.tip as any}>
              <Text style={s.tipTxt as any}>TIP: SAVE TRICKS FOR ROUND 5 — ECHO MAKES IT TRIPLE.</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============== DESIGN F — CENTERED MARQUEE + SCAN BEAM ============== */
function DesignF() {
  return (
    <View style={s.stage as any}>
      <View style={s.cBand as any} pointerEvents="none" />
      <Text style={[s.cGhost, Platform.OS === "web" && ({ animation: "p5-float 5s ease-in-out infinite" } as any)] as any} pointerEvents="none">
        P
      </Text>
      <View style={[s.beam, Platform.OS === "web" && ({ animation: "p5-beamV 3.6s linear infinite" } as any)] as any} pointerEvents="none" />

      <View style={s.frameCenter as any}>
        <Text style={[s.logo, Platform.OS === "web" && ({ animation: "heroIn 560ms 100ms both" } as any)] as any}>PACIFY</Text>
        <Text style={[s.kicker, { textAlign: "center" } as any]}>SELECT YOUR POISON</Text>

        <View style={s.fList as any}>
          {NAV.map((it) => (
            <Pressable
              key={it.label}
              disabled={!it.to}
              onPress={it.to ? () => router.push(it.to as string) : undefined}
              style={({ hovered }) => [s.fWord as any, hovered && it.to && (s.fWordHover as any)]}
            >
              {({ hovered }) => (
                <View style={s.fWordInner as any}>
                  <Text style={[s.bIndex as any, hovered && (s.bIndexOn as any)]}>{it.n}</Text>
                  <Text style={[s.bWordText as any, { fontSize: 52 } as any, hovered && it.to && { color: theme.color.crimson } as any, !it.to && { opacity: 0.4 } as any]}>
                    {it.label}
                  </Text>
                  {!it.to && <Text style={s.bSoon as any}>SOON</Text>}
                  {hovered && it.to && <View style={s.bUnderline as any} />}
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={s.bFoot as any}>
          {UTIL.map((u) => (
            <WedgeButton key={u.label} label={u.label} size="md" variant="ghost" onPress={() => router.push(u.to)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const HATCH =
  "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any
      : {}),
  } as any,
  slashL: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", backgroundColor: "rgba(230,0,18,0.9)", opacity: 0.14, transform: [{ skewX: "-18deg" }] } as any,
  slashR: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", backgroundColor: "rgba(163,0,12,0.55)", opacity: 0.12, transform: [{ skewX: "16deg" }] } as any,
  frame: { flex: 1, paddingHorizontal: 48, paddingTop: 40, paddingBottom: 32, zIndex: 2 } as any,

  logo: { fontFamily: theme.font.display, fontSize: 72, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, marginTop: 4 } as any,
  subtitle: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 1, color: "rgba(255,255,255,0.7)", marginTop: 6 } as any,

  // A
  aTop: { flexDirection: "row", alignItems: "flex-end", gap: 18 } as any,
  aBody: { flex: 1, flexDirection: "row", gap: 40, marginTop: 28, alignItems: "center" } as any,
  aLeft: { flex: 1.1, gap: 14, maxWidth: 560 } as any,
  aTitle: { fontFamily: theme.font.display, fontSize: 64, color: theme.color.paper, transform: [{ skewX: "-8deg" }], textShadow: `6px 6px 0 ${theme.color.crimson}`, lineHeight: 60 } as any,
  stack: { gap: 10, marginTop: 6 } as any,
  utilRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 14 } as any,
  aRight: { flex: 1, gap: 12, alignItems: "flex-end", maxWidth: 460 } as any,
  paper: { width: "100%", backgroundColor: theme.color.paper, borderLeftWidth: 6, borderLeftColor: theme.color.crimson, borderWidth: 1, borderColor: "#2A2A2A", padding: 20, gap: 8, transform: [{ skewX: "-3deg" }] } as any,
  paperTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  paperKick: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.crimson, fontWeight: "700" } as any,
  stamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: "3deg" }] } as any,
  stampTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "700" } as any,
  paperTitle: { fontFamily: theme.font.display, fontSize: 30, color: theme.color.black, transform: [{ skewX: "3deg" }] } as any,
  paperBody: { fontFamily: theme.font.body, fontSize: 13, lineHeight: 18, color: "#333", transform: [{ skewX: "3deg" }] } as any,
  stats: { flexDirection: "row", gap: 12, marginTop: 8, transform: [{ skewX: "3deg" }] } as any,
  stat: { flex: 1, backgroundColor: theme.color.black, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: theme.color.crimson } as any,
  statVal: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.paper } as any,
  statLbl: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.yellow } as any,
  tip: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "rgba(255,255,255,0.55)", textAlign: "right" } as any,

  // B
  bRed: { position: "absolute", top: 0, bottom: 0, left: 0, width: "44%", backgroundColor: "rgba(230,0,18,0.16)", transform: [{ skewX: "-10deg" }], marginLeft: "-6%" } as any,
  bHead: { flexDirection: "row", alignItems: "flex-end", gap: 18 } as any,
  bList: { flex: 1, justifyContent: "center", gap: 6, marginTop: 20 } as any,
  bWord: { paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.08)" } as any,
  bWordHover: { borderBottomColor: theme.color.yellow } as any,
  bWordInner: { flexDirection: "row", alignItems: "center", gap: 18, position: "relative" } as any,
  bIndex: { fontFamily: theme.font.display, fontSize: 22, color: theme.color.crimson, letterSpacing: 1, minWidth: 40 } as any,
  bIndexOn: { color: theme.color.yellow } as any,
  bWordText: { fontFamily: theme.font.display, fontSize: 60, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,
  bSoon: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.paper, opacity: 0.5, marginLeft: 12 } as any,
  bUnderline: { position: "absolute", bottom: -2, left: 58, right: 0, height: 4, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  bFoot: { flexDirection: "row", gap: 8, marginTop: 18 } as any,

  // C
  cBand: { position: "absolute", top: "34%", left: "-10%", width: "120%", height: 220, backgroundColor: theme.color.yellow, opacity: 0.07, transform: [{ rotate: "-12deg" }] } as any,
  cGhost: { position: "absolute", top: "6%", right: "4%", fontFamily: theme.font.display, fontSize: 360, color: theme.color.paper, opacity: 0.05, transform: [{ skewX: "-8deg" }] } as any,
  cHead: { flexDirection: "row", alignItems: "flex-end", gap: 18 } as any,
  cList: { flex: 1, justifyContent: "center", gap: 12, marginTop: 22, maxWidth: 620 } as any,
  ticket: { transform: [{ skewX: "-3deg" }] } as any,

  // picker (TEMP)
  picker: { position: "absolute", top: 14, right: 14, zIndex: 99, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", padding: 6, borderWidth: 1, borderColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  pickerLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.yellow, marginRight: 4 } as any,
  pickBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(10,10,10,0.9)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 14, color: theme.color.paper } as any,

  // B word variants
  bWordLight: { borderBottomColor: "rgba(255,255,255,0.25)" } as any,

  // E split
  eRed: { position: "absolute", top: 0, bottom: 0, left: 0, width: "50%", backgroundColor: "rgba(230,0,18,0.22)", transform: [{ skewX: "-8deg" }], marginLeft: "-5%" } as any,
  eCols: { flex: 1, flexDirection: "row", gap: 40, marginTop: 30, alignItems: "center" } as any,
  eLeft: { flex: 1.2, gap: 14 } as any,
  eRight: { flex: 0.8, gap: 18, alignItems: "flex-start", maxWidth: 360 } as any,
  eTag: { fontFamily: theme.font.display, fontSize: 30, color: theme.color.paper, lineHeight: 34, transform: [{ skewX: "-8deg" }], textShadow: `5px 5px 0 ${theme.color.crimson}` } as any,
  tipTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.7)" } as any,

  // F centered
  frameCenter: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, zIndex: 2, alignItems: "center" } as any,
  fList: { alignItems: "center", gap: 4, marginTop: 26 } as any,
  fWord: { paddingVertical: 4, borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.08)" } as any,
  fWordHover: { borderBottomColor: theme.color.yellow } as any,
  fWordInner: { flexDirection: "row", alignItems: "center", gap: 16, position: "relative", justifyContent: "center" } as any,
  beam: { position: "absolute", top: 0, bottom: 0, left: "38%", width: 120, backgroundColor: "rgba(230,0,18,0.10)", transform: [{ skewX: "-12deg" }] } as any,
});
