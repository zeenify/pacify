import React, { useEffect, useRef } from "react";
import { Pressable, Text, StyleSheet, Animated, Platform } from "react-native";
import { theme } from "../tokens";

/**
 * P5 PRESS START — blinking, hard-bordered, with arrow that nudges.
 * No longer a tiny pill: feels like a arcade attract mode.
 */
export function PressStartHint({ label, onPress }: { label: string; onPress?: () => void }) {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === "web") return; // CSS handles it
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  const Inner = (
    <Text style={styles.text}>
      ▶  {label}  ◀
    </Text>
  );

  if (Platform.OS === "web") {
    return (
      <Pressable onPress={onPress} hitSlop={20} style={styles.wrap as any}>
        <Text style={[styles.text, { animation: "p5-blink 900ms step-end infinite" } as any]}>{`▶  ${label}  ◀`}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} hitSlop={20} style={styles.wrap}>
      <Animated.View style={{ opacity: blink }}>{Inner}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    transform: [{ skewX: `${theme.skew}deg` }],
    borderWidth: theme.border.medium,
    borderColor: theme.color.paper,
    backgroundColor: theme.color.crimson,
    paddingHorizontal: 26,
    paddingVertical: 11,
    // hard shadow
    marginRight: 6,
    marginBottom: 6,
  } as any,
  text: {
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 13,
    letterSpacing: 5,
    fontWeight: "800",
    transform: [{ skewX: `${-theme.skew}deg` }],
    textAlign: "center",
  } as any,
});
