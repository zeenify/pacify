import React from "react";
import { Pressable, Text, View, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "locked";
  size?: "md" | "lg" | "hero";
  sub?: string;
  indexLabel?: string;
};

/**
 * Clean P5 button — like .cta + .menu a + .project-row
 * skewX(-8deg), border 4px solid #fff, box-shadow 8px 8px 0 #000, hover lift
 */
export function WedgeButton({ label, onPress, variant = "primary", size = "lg", sub, indexLabel }: Props) {
  const padV = size === "hero" ? 14 : size === "lg" ? 12 : 10;
  const fontS = size === "hero" ? 18 : size === "lg" ? 15 : 12;

  if (variant === "locked") {
    return (
      <View style={[styles.base, styles.locked, { paddingVertical: padV } as any]}>
        <Text style={[styles.label, { fontSize: fontS, color: "rgba(255,255,255,0.45)" } as any]}>{label}</Text>
        <Text style={styles.lockedTag}>SOON</Text>
      </View>
    );
  }

  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.shadow,
        pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] } as any,
        hovered && !pressed && { transform: [{ translateX: -2 }, { translateY: -2 }] } as any,
        Platform.OS === "web" && ({ transition: "transform 150ms cubic-bezier(0.175,0.885,0.32,1.275), background 150ms" } as any),
      ]}
    >
      {({ pressed, hovered }) => (
        <View
          style={[
            styles.base,
            isPrimary ? styles.primary : styles.ghost,
            { paddingVertical: padV } as any,
            hovered && !pressed && (isPrimary ? styles.primaryHover : styles.ghostHover),
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.inner as any}>
            {indexLabel ? (
              <Text style={styles.num as any}>{indexLabel}</Text>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.label,
                  { fontSize: fontS },
                  !isPrimary && hovered && { color: theme.color.crimson } as any,
                  isPrimary && hovered && !pressed && { color: theme.color.black } as any,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {sub ? <Text style={[styles.sub as any, isPrimary && hovered && !pressed && { color: "rgba(0,0,0,0.55)" } as any]} numberOfLines={1}>{sub}</Text> : null}
            </View>
            <Text style={[styles.arrow as any, hovered && !pressed && { opacity: 1, transform: [{ translateX: 4 }] } as any, isPrimary && hovered && { color: theme.color.black } as any]}>›</Text>
          </View>
          {/* yellow underline on hover, like menu a::after */}
          {hovered && !pressed ? <View style={styles.underline as any} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { marginRight: 8, marginBottom: 8 } as any,
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    minWidth: 220,
    borderWidth: 4,
    borderColor: theme.color.paper,
    backgroundColor: theme.color.crimson,
    transform: [{ skewX: "-8deg" }],
    overflow: "hidden",
  } as any,
  pressed: { transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }] } as any,
  primary: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  primaryHover: { backgroundColor: theme.color.paper, borderColor: theme.color.paper } as any,
  ghost: { backgroundColor: "rgba(10,10,10,0.92)", borderColor: "#2A2A2A" } as any,
  ghostHover: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  locked: {
    backgroundColor: "rgba(16,16,16,0.96)",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: "#333",
    paddingHorizontal: 18,
    minWidth: 220,
    transform: [{ skewX: "-3deg" }],
    opacity: 0.6,
  } as any,
  inner: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, transform: [{ skewX: "8deg" }] } as any,
  num: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.crimson, letterSpacing: 1, minWidth: 28 } as any,
  label: { fontFamily: theme.font.display, color: theme.color.paper, letterSpacing: 1.5 } as any,
  sub: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "rgba(255,255,255,0.72)", marginTop: 2 } as any,
  arrow: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.paper, opacity: 0.5 } as any,
  underline: { position: "absolute", bottom: 0, left: "10%", right: "10%", height: 3, backgroundColor: theme.color.yellow } as any,
  lockedTag: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.paper, opacity: 0.5, marginLeft: 8 } as any,
});
