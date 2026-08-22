/* GATE — flow is Login -> Load -> Start -> Menu.
   Valid session? straight to Load (the one-time fetch). Otherwise, enrollment. */
import { View, Text, StyleSheet, Platform } from "react-native";
import { router, useRootNavigationState } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useEffect } from "react";
import { api } from "../lib/api";

export default function Gate() {
  const navReady = useRootNavigationState();
  useEffect(() => {
    if (!navReady?.key) return; // navigator must mount before we can navigate
    api("/auth/me")
      .then(() => router.replace("/load"))
      .catch(() => router.replace("/login"));
  }, [navReady?.key]);

  return (
    <View style={s.stage as any}>
      <Text
        style={[
          s.txt as any,
          Platform.OS === "web" && ({ animation: "p5-blinkHard 1s steps(1) infinite" } as any),
        ]}
      >
        PACIFY
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({
          backgroundImage: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
        } as any)
      : {}),
  } as any,
  txt: { fontFamily: theme.font.display, fontSize: 42, color: theme.color.paper, letterSpacing: 4, transform: [{ skewX: "-8deg" }], textShadow: `5px 5px 0 ${theme.color.crimson}` } as any,
});
