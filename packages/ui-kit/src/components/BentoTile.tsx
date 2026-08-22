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
 * Clean P5 card — like .project-row
 * grid + skewX(-3deg), border-left 7px solid var(--p5-red), rowIn stagger, hover bg var(--p5-red)
 */
export function BentoTile({ children, span = 1, tone = "dark", onPress, locked, ribbon, style }: Props) {
  const bg =
    tone === "crimson" ? theme.color.crimson : tone === "paper" ? theme.color.paper : "rgba(16,16,16,0.96)";

  const frame = (content: React.ReactNode, extraStyle?: any) => (
    <View style={[styles.shadow, locked && { opacity: 0.55 } as any, style, { flex: span }, extraStyle]}>
      <View style={[styles.card, { backgroundColor: bg }, locked && styles.locked as any]}>
        {ribbon ? (
          <View style={styles.ribbon as any}>
            <Text style={styles.ribbonText}>{ribbon}</Text>
          </View>
        ) : null}
        <View style={styles.inner as any}>{content}</View>
      </View>
    </View>
  );

  if (!onPress || locked) return frame(children);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.shadow,
        { flex: span },
        Platform.OS === "web" && ({ transition: "transform 140ms cubic-bezier(0.175,0.885,0.32,1.275), background 140ms" } as any),
        hovered && !pressed && { transform: [{ skewX: "-3deg" }, { translateX: 4 }] } as any,
        pressed && { transform: [{ skewX: "-3deg" }, { translateX: 2 }] } as any,
        style,
      ]}
    >
      {({ hovered }) => (
        <View style={[styles.card, { backgroundColor: hovered ? theme.color.crimson : bg }, locked && styles.locked as any, hovered && styles.cardHover as any]}>
          {ribbon ? (
            <View style={styles.ribbon as any}>
              <Text style={styles.ribbonText}>{ribbon}</Text>
            </View>
          ) : null}
          <View style={styles.inner as any}>{children}</View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { marginRight: 6, marginBottom: 6, minHeight: 132 } as any,
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    backgroundColor: "rgba(16,16,16,0.96)",
    transform: [{ skewX: "-3deg" }],
    overflow: "hidden",
    padding: 0,
  } as any,
  locked: { borderLeftColor: "#333", opacity: 0.7 } as any,
  cardHover: { borderColor: theme.color.paper, backgroundColor: theme.color.crimson } as any,
  inner: { padding: 14, transform: [{ skewX: "3deg" }], flex: 1 } as any,
  ribbon: {
    position: "absolute",
    top: 8,
    right: 10,
    backgroundColor: theme.color.paper,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.color.black,
    transform: [{ skewX: "3deg" }],
    zIndex: 2,
  } as any,
  ribbonText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: theme.color.black, fontWeight: "700" } as any,
});
