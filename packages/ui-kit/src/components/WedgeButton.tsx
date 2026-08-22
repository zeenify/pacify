import React from "react";
import { Pressable, Text, View, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "locked";
  size?: "md" | "lg" | "hero";
  sub?: string;
  indexLabel?: string; // "01" etc.
};

/**
 * Persona 5 slash menu item — not a website button.
 * Skewed parallelogram, hard black shadow, number badge, arrow that slides on hover.
 * Animation is CSS transition on web, pressed feedback collapses shadow.
 */
export function WedgeButton({ label, onPress, variant = "primary", size = "lg", sub, indexLabel }: Props) {
  const padV = size === "hero" ? 16 : size === "lg" ? 12 : 9;
  const fontS = size === "hero" ? 22 : size === "lg" ? 16 : 12;

  if (variant === "locked") {
    return (
      <View style={[styles.base, styles.locked, { paddingVertical: padV } as any]}>
        <View style={styles.lockedStripe as any} />
        <Text style={[styles.lockedLabel, { fontSize: fontS }]}>{label}</Text>
        <Text style={styles.lockedTag}>COMING SOON</Text>
      </View>
    );
  }

  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.shadowWrap,
        pressed && styles.shadowPressed,
        // web hover transition injected via style as any
        Platform.OS === "web" && ({ transition: "transform 120ms cubic-bezier(0.34,1.56,0.64,1)" } as any),
        hovered && !pressed && { transform: [{ translateX: -4 }] } as any,
      ]}
    >
      {({ pressed, hovered }) => (
        <View
          style={[
            styles.base,
            isPrimary ? styles.primary : styles.ghost,
            { paddingVertical: padV } as any,
            pressed && styles.basePressed,
          ]}
        >
          {/* hachure stripe top edge */}
          <View style={styles.hach as any} />

          <View style={styles.inner}>
            {indexLabel ? (
              <View style={styles.numBox}>
                <Text style={styles.num}>{indexLabel}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1, transform: [{ skewX: `${-theme.skew}deg` }] }}>
              <Text style={[styles.label, { fontSize: fontS }, !isPrimary && { color: theme.color.paper }]} numberOfLines={1}>
                {label}
              </Text>
              {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
            </View>
            <Text style={[styles.arrow, hovered && !pressed && { transform: [{ translateX: 6 }] } as any]}>▶</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    // hard shadow via wrapper — collapse on press gives P5 slam
    // use neutral wrapper, shadow via inner border
    marginRight: 6,
    marginBottom: 6,
  } as any,
  shadowPressed: { marginRight: 2, marginBottom: 2, opacity: 0.98 } as any,
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    minWidth: 260,
    borderWidth: theme.border.medium,
    borderColor: theme.color.paper,
    transform: [{ skewX: `${theme.skew}deg` }],
    overflow: "hidden",
  } as any,
  basePressed: { transform: [{ skewX: `${theme.skew}deg` }, { translateX: 2 }, { translateY: 2 }] } as any,
  primary: { backgroundColor: theme.color.crimson } as any,
  ghost: { backgroundColor: theme.color.ink, borderColor: theme.color.borderStrong } as any,
  locked: {
    backgroundColor: theme.color.surface2,
    borderWidth: theme.border.medium,
    borderColor: theme.color.border,
    paddingHorizontal: 18,
    minWidth: 260,
    transform: [{ skewX: `${theme.skew}deg` }],
    opacity: 0.55,
    overflow: "hidden",
  } as any,
  lockedStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: theme.color.borderStrong,
  } as any,
  inner: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 } as any,
  numBox: {
    width: 36,
    height: 36,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ skewX: `${-theme.skew}deg` }, { rotate: "-2deg" }],
  } as any,
  num: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 11, letterSpacing: 0.5, fontWeight: "800" } as any,
  label: { color: theme.color.paper, fontFamily: theme.font.display, letterSpacing: 1.5, fontWeight: "900" } as any,
  sub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1, marginTop: 1 } as any,
  arrow: { color: theme.color.paper, fontSize: 14, marginLeft: 8, opacity: 0.9 } as any,
  hach: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "rgba(250,250,245,0.12)",
  } as any,
  lockedLabel: { color: theme.color.paperDim, fontFamily: theme.font.display, letterSpacing: 1.5 } as any,
  lockedTag: { color: theme.color.crimson, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 2, marginTop: 2 } as any,
});
