import { View, Text, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { RansomTitle, PressStartHint } from "@pacify/ui-kit";

export default function Title() {
  return (
    <View style={s.stage as any}>
      <View style={s.slash as any} pointerEvents="none" />
      <View style={s.slash2 as any} pointerEvents="none" />

      <View style={s.topbar as any}>
        <Text style={s.mark as any}>PAC<Text style={{ color: theme.color.crimson } as any}>I</Text>FY</Text>
        <View style={s.tag as any}>
          <Text style={s.tagText}>PRESS ○ TO ENTER</Text>
        </View>
      </View>

      <View style={s.hero as any}>
        <View style={s.heroLeft as any}>
          <Text style={[s.kicker as any, Platform.OS === "web" && ({ animation: "heroIn 560ms 120ms both" } as any)]}>SLOW-BURN PSYCHOLOGICAL WAR</Text>
          <View style={Platform.OS === "web" ? ({ animation: "heroIn 620ms 200ms both" } as any) : undefined}>
            <RansomTitle text="PACIFY" size={84} />
          </View>
          <Text style={[s.role as any, Platform.OS === "web" && ({ animation: "heroIn 560ms 320ms both" } as any)]}>
            13 Students <Text style={{ color: theme.color.crimson } as any}>·</Text> 5 Rounds <Text style={{ color: theme.color.crimson } as any}>·</Text> 1 Liar
          </Text>
          <Text style={[s.intro as any, Platform.OS === "web" && ({ animation: "heroIn 600ms 420ms both" } as any)]}>
            Hidden hands. Simultaneous reveal. Tricks void, peek, swap, ward, echo. Learn them faster than they learn you — hard from seat 01.
          </Text>
          <View style={Platform.OS === "web" ? ({ animation: "heroIn 540ms 580ms both" } as any) : undefined}>
            <PressStartHint label="ENTER THE CLASSROOM" onPress={() => router.replace("/menu")} />
          </View>
        </View>

        <View style={s.heroRight as any}>
          <View style={[s.stats as any, Platform.OS === "web" && ({ animation: "statIn 560ms 720ms both" } as any)]}>
            <View style={s.stat as any}>
              <Text style={s.statVal}>13</Text>
              <Text style={s.statLabel}>STUDENTS</Text>
            </View>
            <View style={s.stat as any}>
              <Text style={s.statVal}>5</Text>
              <Text style={s.statLabel}>ROUNDS</Text>
            </View>
            <View style={s.stat as any}>
              <Text style={s.statVal}>HARD</Text>
              <Text style={s.statLabel}>FROM 01</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.jokerAbs as any} pointerEvents="none">
        <View style={s.jokerPlaceholder as any}>
          <Text style={s.jokerText}>CLASSIFIED</Text>
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
    ...(Platform.OS === "web"
      ? ({
          background: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  slash: {
    position: "absolute",
    top: "-10%",
    left: "-5%",
    width: "60%",
    height: "120%",
    backgroundColor: theme.color.crimson,
    opacity: 0.14,
    transform: [{ skewX: "-18deg" }],
  } as any,
  slash2: {
    position: "absolute",
    top: "-10%",
    right: "-8%",
    width: "42%",
    height: "120%",
    backgroundColor: theme.color.crimsonDeep,
    opacity: 0.12,
    transform: [{ skewX: "16deg" }],
  } as any,
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderBottomWidth: 3,
    borderBottomColor: theme.color.crimson,
    backgroundColor: "rgba(10,10,10,0.85)",
    zIndex: 3,
  } as any,
  mark: { fontFamily: theme.font.display, fontSize: 28, color: theme.color.paper, letterSpacing: 1, transform: [{ skewX: "-8deg" }] } as any,
  tag: { marginLeft: "auto", borderWidth: 1, borderColor: theme.color.yellow, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  tagText: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.yellow } as any,
  hero: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 30,
    paddingHorizontal: 40,
    paddingTop: 54,
    paddingBottom: 60,
    zIndex: 3,
  } as any,
  heroLeft: { flex: 1, minWidth: 360, gap: 14, justifyContent: "center" } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 6, color: theme.color.yellow } as any,
  role: { fontFamily: theme.font.body, fontSize: 22, fontWeight: "600", letterSpacing: 1.5, color: theme.color.paper, marginTop: 8 } as any,
  intro: { fontFamily: theme.font.body, fontSize: 16, lineHeight: 24 as any, color: "#E0E0E0", maxWidth: 560, marginTop: 10 } as any,
  heroRight: { flex: 0, minWidth: 320, alignItems: "flex-end", justifyContent: "flex-end", gap: 16, zIndex: 2 } as any,
  stats: {
    flexDirection: "row",
    gap: 22,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: "rgba(10,10,10,0.88)",
    borderWidth: 1,
    borderColor: "rgba(230,0,18,0.3)",
    borderLeftWidth: 3,
    borderLeftColor: theme.color.crimson,
    transform: [{ skewX: "-12deg" }],
  } as any,
  stat: { alignItems: "center", gap: 4, transform: [{ skewX: "12deg" }] } as any,
  statVal: { fontFamily: theme.font.display, fontSize: 36, color: theme.color.paper, letterSpacing: 1, textShadowColor: "#000", textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 } as any,
  statLabel: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.yellow, transform: [{ skewX: "-6deg" }] } as any,
  jokerAbs: { position: "absolute", right: "2%", bottom: "8%", width: "42%", maxWidth: 560, height: "62%", zIndex: 2, opacity: 0.18 } as any,
  jokerPlaceholder: {
    flex: 1,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  } as any,
  jokerText: { fontFamily: theme.font.display, fontSize: 18, letterSpacing: 6, color: "rgba(255,255,255,0.22)" } as any,
});
