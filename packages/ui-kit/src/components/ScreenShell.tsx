import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

export function ScreenShell({ children, tint = "black" }: { children: React.ReactNode; tint?: "black" | "ink" }) {
  return (
    <View style={[styles.root, tint === "ink" && { backgroundColor: theme.color.ink } as any]}>
      <View style={styles.slash as any} pointerEvents="none" />
      <View style={styles.slash2 as any} pointerEvents="none" />
      <View style={styles.frame as any}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.black,
    padding: 0,
    ...(Platform.OS === "web"
      ? ({
          backgroundColor: theme.color.black,
          backgroundImage: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          backgroundPosition: "0 0",
        } as any)
      : {}),
  } as any,
  slash: {
    position: "absolute",
    top: "-10%",
    left: "-5%",
    width: "60%",
    height: "120%",
    backgroundColor: "rgba(230,0,18,0.92)",
    opacity: 0.14,
    transform: [{ skewX: "-18deg" }],
  } as any,
  slash2: {
    position: "absolute",
    top: "-10%",
    right: "-8%",
    width: "42%",
    height: "120%",
    backgroundColor: "rgba(163,0,12,0.55)",
    opacity: 0.12,
    transform: [{ skewX: "16deg" }],
  } as any,
  frame: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 24,
    zIndex: 2,
  } as any,
});