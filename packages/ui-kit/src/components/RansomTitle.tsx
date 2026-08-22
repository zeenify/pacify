import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

export function RansomTitle({ text, size = 84 }: { text: string; size?: number }) {
  const isWeb = Platform.OS === "web";
  return (
    <View style={styles.row} accessible={false}>
      {text.split("").map((ch, i) => {
        if (ch === " ") return <View key={i} style={{ width: size * 0.3 }} />;
        const tilt = ((i * 7) % 8) - 4;
        return (
          <View
            key={i}
            style={[
              styles.glyph as any,
              { transform: [{ rotate: `${tilt}deg` }] } as any,
            ]}
          >
            <Text
              style={[
                styles.char as any,
                {
                  fontSize: size,
                  lineHeight: size * 0.95,
                } as any,
                isWeb && ({ animation: `heroIn 620ms cubic-bezier(0.175,0.885,0.32,1.275) forwards`, animationDelay: `${200 + i * 40}ms`, opacity: 0 } as any),
              ]}
            >
              {ch}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" } as any,
  glyph: { marginHorizontal: 1 } as any,
  char: {
    fontFamily: theme.font.display,
    color: theme.color.paper,
    letterSpacing: 1,
    transform: [{ skewX: "-8deg" }],
    textShadow: `${6}px ${6}px 0 ${theme.color.crimson}`,
  } as any,
});