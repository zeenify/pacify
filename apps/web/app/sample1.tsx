import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useEffect, useRef, useState, useCallback } from "react";

export default function Title() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const audioRef = useRef<AudioContext | null>(null);
  const audioUnlocked = useRef(false);

  const unlockAudio = useCallback(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || audioUnlocked.current) return;
    try {
      audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
      audioUnlocked.current = true;
    } catch {}
  }, []);

  const playHover = useCallback(() => {
    if (!audioUnlocked.current || !audioRef.current) return;
    try {
      const ctx = audioRef.current!;
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 880;
      g.gain.value = 0.07;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      o.stop(ctx.currentTime + 0.08);
    } catch {}
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <View style={s.stage as any}>
      <View style={s.slash as any} pointerEvents="none" />
      <View style={s.slash2 as any} pointerEvents="none" />

      {/* ghost drifts with mouse */}
      <View
        style={[
          s.ghost as any,
          { transform: [{ skewX: "-8deg" }, { translateX: mouse.x * 10 }, { translateY: mouse.y * 6 }] } as any,
          Platform.OS === "web" && ({ transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)" } as any),
        ]}
        pointerEvents="none"
      >
        <Text style={s.ghostText}>PACIFY</Text>
      </View>

      {/* floating fan — each floats */}
      <View
        style={[
          s.fan as any,
          { transform: [{ translateX: mouse.x * -8 }, { translateY: mouse.y * -6 }] } as any,
          Platform.OS === "web" && ({ transition: "transform 600ms" } as any),
        ]}
        pointerEvents="none"
      >
        <View style={[s.card as any, Platform.OS === "web" && ({ animation: "p5-float 3.2s ease-in-out infinite" } as any)]}>
          <Text style={s.cardNum}>Void</Text>
          <View style={s.cardHalftone as any} />
        </View>
        <View
          style={[s.card as any, Platform.OS === "web" && ({ animation: "p5-float 3.6s ease-in-out 0.4s infinite" } as any), { transform: [{ rotate: "6deg" }] } as any]}
        >
          <Text style={s.cardNum}>Echo</Text>
        </View>
        <View
          style={[s.card as any, Platform.OS === "web" && ({ animation: "p5-float 3s ease-in-out 0.8s infinite" } as any), { transform: [{ rotate: "-3deg" }] } as any]}
        >
          <Text style={s.cardNum}>Ward</Text>
        </View>
      </View>

      <View style={s.center as any}>
        <Text style={[s.logo as any, Platform.OS === "web" && ({ animation: "heroIn 620ms 180ms both" } as any)]}>PACIFY</Text>

        <View style={[s.underlineWrap as any, Platform.OS === "web" && ({ animation: "heroIn 520ms 300ms both" } as any)]}>
          <View style={[s.underline as any, Platform.OS === "web" && ({ animation: "p5-entrance 600ms 400ms both" } as any)]} />
          <View style={s.underlineThin as any} />
        </View>

        <Text style={[s.tagline as any, Platform.OS === "web" && ({ animation: "heroIn 600ms 400ms both" } as any)]}>HARD FROM SEAT 01</Text>

        <Pressable
          onHoverIn={playHover}
          onPress={() => {
            unlockAudio();
            router.replace("/menu");
          }}
          onPressIn={unlockAudio}
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
              <Text style={[s.ctaText as any, hovered && { color: theme.color.crimson } as any]}>ENTER</Text>
              <View style={[s.ctaYellow as any, hovered && { height: 6, backgroundColor: theme.color.yellow } as any]} />
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
          background: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  slash: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", backgroundColor: theme.color.crimson, opacity: 0.11, transform: [{ skewX: "-18deg" }] } as any,
  slash2: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", backgroundColor: theme.color.crimsonDeep, opacity: 0.09, transform: [{ skewX: "16deg" }] } as any,
  ghost: { position: "absolute", top: "16%", left: 0, right: 0, alignItems: "center", opacity: 0.05 } as any,
  ghostText: { fontFamily: theme.font.display, fontSize: 220, color: theme.color.paper, letterSpacing: 10, transform: [{ skewX: "-8deg" }] } as any,
  fan: { position: "absolute", top: "26%", left: "50%", width: 300, height: 120, marginLeft: -150, flexDirection: "row", justifyContent: "center", gap: 16, opacity: 0.16 } as any,
  card: {
    width: 88,
    height: 118,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 5,
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
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 10, height: 10 },
    textShadowRadius: 0,
  } as any,
  underlineWrap: { flexDirection: "row", alignItems: "center", gap: 10 } as any,
  underline: { width: 180, height: 8, backgroundColor: theme.color.crimson, transform: [{ skewX: "-8deg" }] } as any,
  underlineThin: { width: 80, height: 4, backgroundColor: theme.color.paper, transform: [{ skewX: "-8deg" }], opacity: 0.9 } as any,
  tagline: { fontFamily: theme.font.body, fontSize: 18, letterSpacing: 7, color: theme.color.paper, fontWeight: "700" } as any,
  cta: {
    marginTop: 16,
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: theme.color.paper,
    paddingHorizontal: 48,
    paddingVertical: 18,
    transform: [{ skewX: "-8deg" }],
    overflow: "hidden",
  } as any,
  ctaHover: {
    backgroundColor: theme.color.paper,
    borderColor: theme.color.paper,
    transform: [{ skewX: "-8deg" }, { translateX: -4 }, { translateY: -4 }, { scale: 1.02 }],
  } as any,
  ctaPressed: { backgroundColor: theme.color.paper, transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }], opacity: 0.96 } as any,
  ctaText: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 6, color: theme.color.paper, transform: [{ skewX: "8deg" }] } as any,
  ctaYellow: { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: theme.color.yellow } as any,
});