import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

/**
 * SAMPLE 1 — CENTER STAGE (rich, not bland)
 * Clean hero but now with depth: ghost logo, card fan, ticker, grain.
 * Still no header/stats spam — just layered.
 */
export default function Sample1() {
  return (
    <View style={s.stage as any}>
      <View style={s.slash as any} pointerEvents="none" />
      <View style={s.slash2 as any} pointerEvents="none" />
      <View style={s.ghost as any} pointerEvents="none">
        <Text style={s.ghostText}>PACIFY</Text>
      </View>

      {/* floating card fan behind */}
      <View style={s.fan as any} pointerEvents="none">
        <View style={[s.card, { transform: [{ rotate: "-8deg" }, { translateY: -10 }] } as any]}>
          <Text style={s.cardNum}>Void</Text>
        </View>
        <View style={[s.card, { transform: [{ rotate: "6deg" }, { translateY: 6 }] } as any]}>
          <Text style={s.cardNum}>Echo</Text>
        </View>
        <View style={[s.card, { transform: [{ rotate: "-3deg" }, { translateY: 2 }] } as any]}>
          <Text style={s.cardNum}>Ward</Text>
        </View>
      </View>

      <View style={s.center as any}>
        <View style={[s.badgeRow as any, Platform.OS === "web" && ({ animation: "heroIn 560ms 80ms both" } as any)]}>
          <View style={s.yellowDot as any} />
          <Text style={s.kicker as any}>13 SEATS • ONE ROOM</Text>
          <View style={s.badge as any}>
            <Text style={s.badgeText}>HARD 01</Text>
          </View>
        </View>

        <Text style={[s.logo as any, Platform.OS === "web" && ({ animation: "heroIn 620ms 180ms both" } as any)]}>PACIFY</Text>

        <View style={[s.underlineWrap as any, Platform.OS === "web" && ({ animation: "heroIn 520ms 300ms both" } as any)]}>
          <View style={s.underline as any} />
          <View style={s.underlineThin as any} />
        </View>

        <Text style={[s.tagline as any, Platform.OS === "web" && ({ animation: "heroIn 600ms 400ms both" } as any)]}>HARD FROM SEAT 01</Text>
        <Text style={[s.sub as any, Platform.OS === "web" && ({ animation: "heroIn 600ms 460ms both" } as any)]}>A classroom war. 5 rounds. The tricks lie louder than the numbers.</Text>

        <Pressable
          onPress={() => router.replace("/menu")}
          style={({ hovered, pressed }) => [
            s.cta as any,
            hovered && !pressed && { transform: [{ skewX: "-8deg" }, { translateX: -2 }, { translateY: -2 }] } as any,
            pressed && { transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }] } as any,
            Platform.OS === "web" && ({ transition: "transform 150ms" } as any),
            Platform.OS === "web" && ({ animation: "heroIn 520ms 560ms both" } as any),
          ]}
        >
          <Text style={s.ctaText}>ENTER</Text>
          <View style={s.ctaYellow as any} />
        </Pressable>

        <Pressable onPress={() => router.replace("/")} style={s.back as any}>
          <Text style={s.backText}>← BACK TO CHOOSER</Text>
        </Pressable>
      </View>

      {/* bottom ticker */}
      <View style={s.ticker as any} pointerEvents="none">
        <Text style={s.tickerText}>5 ROUNDS • VOID • ORACLE • REVERSAL • WARD • ECHO • ROUND 5 ×2 • ECHO ON 4 → ×3 • NO MERCY •</Text>
      </View>

      <Text style={s.foot as any}>SAMPLE 1 — CENTER STAGE (rich) • still clean — tell me “1”</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          background: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  slash: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", backgroundColor: theme.color.crimson, opacity: 0.11, transform: [{ skewX: "-18deg" }] } as any,
  slash2: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", backgroundColor: theme.color.crimsonDeep, opacity: 0.09, transform: [{ skewX: "16deg" }] } as any,
  ghost: { position: "absolute", top: "18%", left: 0, right: 0, alignItems: "center", opacity: 0.045 } as any,
  ghostText: { fontFamily: theme.font.display, fontSize: 180, color: theme.color.paper, letterSpacing: 8, transform: [{ skewX: "-8deg" }] } as any,
  fan: { position: "absolute", top: "28%", left: "50%", width: 260, height: 120, marginLeft: -130, flexDirection: "row", justifyContent: "center", gap: 12, opacity: 0.14 } as any,
  card: {
    width: 74,
    height: 104,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 4,
    borderLeftColor: theme.color.crimson,
  } as any,
  cardNum: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.black, fontWeight: "700" } as any,
  center: { alignItems: "center", gap: 12, zIndex: 2, maxWidth: 560 } as any,
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  yellowDot: { width: 8, height: 8, backgroundColor: theme.color.yellow, transform: [{ rotate: "45deg" }] } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 6, color: theme.color.yellow, fontWeight: "700" } as any,
  badge: { backgroundColor: theme.color.yellow, paddingHorizontal: 8, paddingVertical: 3, transform: [{ skewX: "-8deg" }], marginLeft: 6 } as any,
  badgeText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: theme.color.black, fontWeight: "800", transform: [{ skewX: "8deg" }] } as any,
  logo: {
    fontFamily: theme.font.display,
    fontSize: 96,
    lineHeight: 90 as any,
    color: theme.color.paper,
    letterSpacing: 2,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 8, height: 8 },
    textShadowRadius: 0,
  } as any,
  underlineWrap: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  underline: { width: 140, height: 6, backgroundColor: theme.color.crimson, transform: [{ skewX: "-8deg" }] } as any,
  underlineThin: { width: 60, height: 3, backgroundColor: theme.color.paper, transform: [{ skewX: "-8deg" }], opacity: 0.9 } as any,
  tagline: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 5, color: theme.color.paper, fontWeight: "700" } as any,
  sub: { fontFamily: theme.font.body, fontSize: 12, lineHeight: 16 as any, color: "#BBB", textAlign: "center", marginTop: -4 } as any,
  cta: {
    marginTop: 10,
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: theme.color.paper,
    paddingHorizontal: 36,
    paddingVertical: 14,
    transform: [{ skewX: "-8deg" }],
    overflow: "hidden",
  } as any,
  ctaText: { fontFamily: theme.font.display, fontSize: 18, letterSpacing: 4, color: theme.color.paper, transform: [{ skewX: "8deg" }] } as any,
  ctaYellow: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: theme.color.yellow } as any,
  back: { marginTop: 10, opacity: 0.6 } as any,
  backText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.paper } as any,
  ticker: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.color.yellow,
    paddingVertical: 6,
    alignItems: "center",
    transform: [{ skewX: "-1deg" }],
  } as any,
  tickerText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.black, fontWeight: "800" } as any,
  foot: { position: "absolute", bottom: 28, fontFamily: theme.font.body, fontSize: 8, letterSpacing: 1.2, color: "rgba(255,255,255,0.35)" } as any,
});
