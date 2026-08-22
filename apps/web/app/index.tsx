import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

const SAMPLES = [
  { id: "1", label: "SAMPLE 1", title: "CENTER STAGE", desc: "Big PACIFY, slash, one CTA. Clean hero.", route: "/sample1" },
  { id: "2", label: "SAMPLE 2", title: "WANTED POSTER", desc: "Halftone burst + stamped poster. Editorial.", route: "/sample2" },
  { id: "3", label: "SAMPLE 3", title: "DESK TAPE", desc: "Pinned paper on desk. Minimal + game.", route: "/sample3" },
];

export default function Chooser() {
  return (
    <View style={s.stage as any}>
      <View style={s.slash as any} pointerEvents="none" />
      <View style={s.slash2 as any} pointerEvents="none" />

      <View style={s.header as any}>
        <Text style={s.kicker as any}>PACIFY • START • PICK ONE</Text>
        <Text style={s.title as any}>CHOOSE YOUR START</Text>
        <Text style={s.sub as any}>3 clean takes. No top header junk. No stat spam. Tap to view full-screen — tell me 1 / 2 / 3.</Text>
      </View>

      <View style={s.grid as any}>
        {SAMPLES.map((sp, i) => (
          <Pressable
            key={sp.id}
            onPress={() => router.push(sp.route as any)}
            style={({ hovered, pressed }) => [
              s.card as any,
              hovered && !pressed && { transform: [{ skewX: "-3deg" }, { translateX: -4 }] } as any,
              pressed && { transform: [{ skewX: "-3deg" }, { translateX: 2 }] } as any,
              Platform.OS === "web" && ({ transition: "transform 140ms" } as any),
              Platform.OS === "web" && ({ animation: `rowIn 620ms ${90 + i * 100}ms both` } as any),
            ]}
          >
            <View style={s.cardInner as any}>
              <View style={s.cardTop as any}>
                <Text style={s.cardNum as any}>{sp.id}</Text>
                <View style={s.badge as any}>
                  <Text style={s.badgeText}>{sp.label}</Text>
                </View>
              </View>
              <Text style={s.cardTitle as any}>{sp.title}</Text>
              <Text style={s.cardDesc as any}>{sp.desc}</Text>
              <View style={s.cta as any}>
                <Text style={s.ctaText}>VIEW →</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={s.foot as any}>Current ugly start is gone. These are full-screen — header removed, stats removed, text trimmed.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 18,
    ...(Platform.OS === "web"
      ? ({
          background: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  slash: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", backgroundColor: theme.color.crimson, opacity: 0.08, transform: [{ skewX: "-18deg" }] } as any,
  slash2: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", backgroundColor: theme.color.crimsonDeep, opacity: 0.07, transform: [{ skewX: "16deg" }] } as any,
  header: { gap: 6, zIndex: 2 } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 5, color: theme.color.yellow } as any,
  title: {
    fontFamily: theme.font.display,
    fontSize: 40,
    color: theme.color.paper,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 6, height: 6 },
    textShadowRadius: 0,
  } as any,
  sub: { fontFamily: theme.font.body, fontSize: 12, lineHeight: 16 as any, color: "#CCC", maxWidth: 560 } as any,
  grid: { flexDirection: "row", gap: 14, flexWrap: "wrap", zIndex: 2 } as any,
  card: {
    flex: 1,
    minWidth: 220,
    backgroundColor: "rgba(16,16,16,0.96)",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 18,
    transform: [{ skewX: "-3deg" }],
  } as any,
  cardInner: { gap: 8, transform: [{ skewX: "3deg" }] } as any,
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any,
  cardNum: { fontFamily: theme.font.display, fontSize: 28, color: theme.color.crimson } as any,
  badge: { backgroundColor: theme.color.yellow, paddingHorizontal: 8, paddingVertical: 3, transform: [{ skewX: "-8deg" }] } as any,
  badgeText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1.5, color: theme.color.black, fontWeight: "700", transform: [{ skewX: "8deg" }] } as any,
  cardTitle: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.paper, letterSpacing: 1 } as any,
  cardDesc: { fontFamily: theme.font.body, fontSize: 12, lineHeight: 14 as any, color: "#999" } as any,
  cta: { marginTop: 6, backgroundColor: theme.color.paper, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: theme.color.black } as any,
  ctaText: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1.5, color: theme.color.black, fontWeight: "700" } as any,
  foot: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "#666", zIndex: 2 } as any,
});
