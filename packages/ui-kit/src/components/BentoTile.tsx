import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

type Props = {
  children: React.ReactNode;
  span?: number;
  tone?: "dark" | "crimson" | "paper";
  onPress?: () => void;
  locked?: boolean;
  ribbon?: string;
  style?: any;
};

/**
 * P5 ComicPanel — replaces bento.
 * Skewed hard frame, inner unskew, tape corners, halftone blast corner, hachure top.
 * Not a dashboard tile: feels like a collectible card/ polaroid on a desk.
 */
export function BentoTile({ children, span = 1, tone = "dark", onPress, locked, ribbon, style }: Props) {
  const bg =
    tone === "crimson" ? theme.color.crimson : tone === "paper" ? theme.color.paper : theme.color.surface2;
  const isPaper = tone === "paper";

  const frame = (content: React.ReactNode) => (
    <View style={[styles.shadow, locked && { opacity: 0.5 } as any, style, { flex: span }]}>
      <View style={[styles.frame, { backgroundColor: bg }, locked && styles.frameLocked]}>
        <View style={styles.hach as any} />
        <View style={styles.halftone as any} />
        {/* tape strips */}
        <View style={[styles.tape, styles.tapeTL as any]} />
        <View style={[styles.tape, styles.tapeTR as any]} />
        {ribbon ? (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{ribbon}</Text>
          </View>
        ) : null}
        <View style={styles.inner}>{content}</View>
      </View>
    </View>
  );

  const inner = (
    <>
      <View style={isPaper ? { } : { }}>
        {children}
      </View>
    </>
  );

  if (!onPress || locked) return frame(inner);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.shadow,
        { flex: span },
        Platform.OS === "web" && ({ transition: "transform 130ms cubic-bezier(0.34,1.56,0.64,1)" } as any),
        hovered && !pressed && { transform: [{ translateX: -3 }, { translateY: -3 }] } as any,
        pressed && { transform: [{ translateX: 2 }, { translateY: 2 }], opacity: 0.97 } as any,
        style,
      ]}
    >
      <View style={[styles.frame, { backgroundColor: bg }]}>
        <View style={styles.hach as any} />
        <View style={styles.halftone as any} />
        <View style={[styles.tape, styles.tapeTL as any]} />
        <View style={[styles.tape, styles.tapeTR as any]} />
        {ribbon ? (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{ribbon}</Text>
          </View>
        ) : null}
        <View style={styles.inner}>{children}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    // hard P5 shadow via outer margin + inner border — no blur
    marginRight: 6,
    marginBottom: 6,
    minHeight: 132,
  } as any,
  frame: {
    flex: 1,
    borderWidth: theme.border.thick,
    borderColor: theme.color.paper,
    overflow: "hidden",
    transform: [{ skewX: `${theme.skew * 0.5}deg` }],
  } as any,
  frameLocked: { borderColor: theme.color.borderStrong } as any,
  inner: {
    padding: theme.space.md,
    transform: [{ skewX: `${-theme.skew * 0.5}deg` }],
    flex: 1,
  } as any,
  hach: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "rgba(250,250,245,0.10)",
  } as any,
  halftone: {
    position: "absolute",
    right: -18,
    bottom: -18,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(212,0,0,0.10)",
    borderWidth: 12,
    borderColor: "rgba(0,0,0,0.25)",
  } as any,
  tape: {
    position: "absolute",
    width: 42,
    height: 12,
    backgroundColor: "rgba(250,250,245,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    zIndex: 2,
  } as any,
  tapeTL: { top: -6, left: 14, transform: [{ rotate: "-8deg" }] } as any,
  tapeTR: { top: -6, right: 14, transform: [{ rotate: "7deg" }] } as any,
  ribbon: {
    position: "absolute",
    top: 10,
    right: -20,
    transform: [{ rotate: "18deg" }],
    backgroundColor: theme.color.paper,
    paddingHorizontal: 26,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: theme.color.black,
    zIndex: 3,
  } as any,
  ribbonText: {
    color: theme.color.black,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "800",
  } as any,
});
