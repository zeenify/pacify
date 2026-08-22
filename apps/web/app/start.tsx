/* TITLE SCREEN — sits AFTER Load in the flow: Login -> Load -> Start -> Menu.
   Sound is already buffered+unlocked by the time we get here (login click was
   the gesture), so hover beeps work immediately. ENTER press re-asserts unlock. */
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useEffect, useState } from "react";
import { playHover, unlockSfx } from "../lib/sfx";

const GHOST_LETTERS = [
  { c: "P", rot: -14, y: -16, sz: 200 },
  { c: "A", rot: 9, y: 20, sz: 176 },
  { c: "C", rot: -7, y: -24, sz: 210 },
  { c: "I", rot: 12, y: 12, sz: 168 },
  { c: "F", rot: -11, y: 22, sz: 188 },
  { c: "Y", rot: 5, y: -14, sz: 196 },
];

const FAN_CARDS = [
  { label: "Void", rot: -18, y: 22, w: 96, anim: "p5-float 3.2s ease-in-out infinite" },
  { label: "Echo", rot: 14, y: -30, w: 82, anim: "p5-float 3.7s ease-in-out 0.3s infinite" },
  { label: "Ward", rot: -9, y: 30, w: 100, anim: "p5-float 3s ease-in-out 0.7s infinite" },
];

export default function Start() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // backup gesture capture — any click/keypress here unlocks audio too
    const unlock = () => {
      unlockSfx();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <View style={s.stage as any}>
      <View style={[s.slashSkew, { pointerEvents: "none" } as any]}>
        <View style={[s.slashAnim, Platform.OS === "web" && ({ animation: "p5-slashA 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>
      <View style={[s.slash2Skew, { pointerEvents: "none" } as any]}>
        <View style={[s.slash2Anim, Platform.OS === "web" && ({ animation: "p5-slashB 0.9s 0.3s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>

      {/* ghost PACIFY — scattered letters, drifts with mouse */}
      <View
        style={[
          s.ghost as any,
          { transform: [{ skewX: "-8deg" }, { translateX: mouse.x * 12 }, { translateY: mouse.y * 7 }] } as any,
          Platform.OS === "web" && ({ transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)" } as any),
          { pointerEvents: "none" } as any,
        ]}
      >
        {GHOST_LETTERS.map((g, i) => (
          <Text key={i} style={[s.ghostLetter as any, { fontSize: g.sz, transform: [{ rotate: g.rot + "deg" }, { translateY: g.y }] } as any]}>
            {g.c}
          </Text>
        ))}
      </View>

      {/* floating fan — scattered cards, each floats independently */}
      <View
        style={[
          s.fan as any,
          { transform: [{ translateX: mouse.x * -9 }, { translateY: mouse.y * -7 }] } as any,
          Platform.OS === "web" && ({ transition: "transform 600ms" } as any),
          { pointerEvents: "none" } as any,
        ]}
      >
        {FAN_CARDS.map((card, i) => (
          <View key={i} style={[s.cardScatter as any, { transform: [{ rotate: card.rot + "deg" }, { translateY: card.y }] } as any]}>
            <View style={[s.card as any, { width: card.w } as any, Platform.OS === "web" && ({ animation: card.anim } as any)]}>
              <Text style={s.cardNum}>{card.label}</Text>
              <View style={s.cardHalftone as any} />
            </View>
          </View>
        ))}
      </View>

      <View style={s.center as any}>
        <Text style={s.logo as any}>
          {"PACIFY".split("").map((ch, i) => (
            <Text
              key={i}
              style={[
                s.logoLetter as any,
                Platform.OS === "web" && ({ animation: `p5-logoLetter 600ms ${i * 70 + 120}ms cubic-bezier(0.16,1,0.3,1) both` } as any),
              ]}
            >
              {ch}
            </Text>
          ))}
        </Text>

        <View style={[s.underlineWrap as any, Platform.OS === "web" && ({ animation: "heroIn 520ms 300ms both" } as any)]}>
          <View style={[s.underline as any, Platform.OS === "web" && ({ animation: "p5-entrance 600ms 400ms both" } as any)]} />
          <View style={s.underlineThin as any} />
        </View>

        <Text style={[s.tagline as any, Platform.OS === "web" && ({ animation: "heroIn 600ms 400ms both" } as any)]}>DONT OVERTHINK IT</Text>

        <Pressable
          onHoverIn={playHover}
          onPress={() => {
            unlockSfx();
            router.replace("/menu");
          }}
          style={({ hovered, pressed }) => [
            s.cta as any,
            hovered && !pressed && s.ctaHover as any,
            pressed && s.ctaPressed as any,
            Platform.OS === "web" && ({ transition: "all 180ms cubic-bezier(0.175,0.885,0.32,1.275)" } as any),
            Platform.OS === "web" && ({ animation: "heroIn 520ms 560ms both" } as any),
          ]}
        >
          {({ hovered }) => (
            <>
              <Text style={[s.ctaText as any, hovered && ({ color: theme.color.crimson } as any)]}>ENTER</Text>
              <Text style={[s.ctaArrow as any, hovered && ({ color: theme.color.crimson, opacity: 1 } as any)]}>{hovered ? "▶ GO" : "◇"}</Text>
              <View style={[s.ctaYellow as any, hovered && ({ height: 9, backgroundColor: theme.color.crimson } as any)]} />
            </>
          )}
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
    paddingHorizontal: 24,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          backgroundColor: theme.color.black,
          backgroundImage: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  // background slashes: skew on wrapper, slide animation on inner (no transform conflict)
  slashSkew: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", transform: [{ skewX: "-18deg" }], overflow: "hidden" } as any,
  slashAnim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.color.crimson, opacity: 0.11 } as any,
  slash2Skew: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", transform: [{ skewX: "16deg" }], overflow: "hidden" } as any,
  slash2Anim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.color.crimsonDeep, opacity: 0.09 } as any,
  ghost: { position: "absolute", top: "10%", left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "flex-start", opacity: 0.07, gap: 2 } as any,
  ghostLetter: { fontFamily: theme.font.display, color: theme.color.paper, letterSpacing: -8 } as any,
  fan: { position: "absolute", top: "22%", left: "50%", width: 380, height: 200, marginLeft: -190, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 22, opacity: 0.2 } as any,
  cardScatter: { alignItems: "center", justifyContent: "center" } as any,
  card: {
    height: 124,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
  } as any,
  cardHalftone: { position: "absolute", bottom: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(230,0,18,0.12)" } as any,
  cardNum: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1, color: theme.color.black, fontWeight: "700" } as any,
  center: { alignItems: "center", gap: 18, zIndex: 2, maxWidth: 700 } as any,
  logo: {
    fontFamily: theme.font.display,
    fontSize: 138,
    lineHeight: 126 as any,
    color: theme.color.paper,
    letterSpacing: 4,
    transform: [{ skewX: "-8deg" }],
    textShadow: `10px 10px 0 ${theme.color.crimson}`,
  } as any,
  logoLetter: { display: "inline-block", textShadow: `10px 10px 0 ${theme.color.crimson}` } as any,
  underlineWrap: { flexDirection: "row", alignItems: "center", gap: 10 } as any,
  underline: { width: 180, height: 8, backgroundColor: theme.color.crimson, transform: [{ skewX: "-8deg" }] } as any,
  underlineThin: { width: 80, height: 4, backgroundColor: theme.color.paper, transform: [{ skewX: "-8deg" }], opacity: 0.9 } as any,
  tagline: { fontFamily: theme.font.body, fontSize: 18, letterSpacing: 7, color: theme.color.paper, fontWeight: "700" } as any,
  cta: {
    marginTop: 16,
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: theme.color.paper,
    paddingHorizontal: 54,
    paddingVertical: 18,
    transform: [{ skewX: "-8deg" }],
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  } as any,
  ctaHover: {
    backgroundColor: theme.color.paper,
    borderColor: theme.color.yellow,
    transform: [{ skewX: "-8deg" }, { translateX: -5 }, { translateY: -5 }, { scale: 1.04 }],
    shadowColor: theme.color.crimson,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 22,
  } as any,
  ctaPressed: { backgroundColor: theme.color.paper, borderColor: theme.color.yellow, transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }], opacity: 0.96, shadowColor: theme.color.crimson, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14 } as any,
  ctaText: { fontFamily: theme.font.display, fontSize: 26, letterSpacing: 6, color: theme.color.paper, transform: [{ skewX: "8deg" }] } as any,
  ctaArrow: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1, color: theme.color.paper, opacity: 0.5, transform: [{ skewX: "8deg" }] } as any,
  ctaYellow: { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: theme.color.yellow } as any,
});
