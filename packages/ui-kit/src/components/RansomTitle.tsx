import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

const GLYPH_FONTS = ["Archivo Black", "Syne", "JetBrains Mono"];

/**
 * Ransom-note lettering: mixed fonts, per-letter tilt, one inverted letter in a crimson box.
 */
export function RansomTitle({ text, size = 48 }: { text: string; size?: number }) {
  const invertIdx = Math.floor(text.length / 2);
  return (
    <View style={styles.row}>
      {text.split("").map((ch, i) => {
        if (ch === " ") return <View key={i} style={{ width: size * 0.4 }} />;
        const font = GLYPH_FONTS[i % GLYPH_FONTS.length];
        const tilt = ((i * 7) % 11) - 5;
        const isInverted = i === invertIdx;
        return (
          <View
            key={i}
            style={[
              styles.glyphBox,
              isInverted && { backgroundColor: theme.color.crimson },
              {
                transform: [{ rotate: `${tilt}deg` }],
                paddingHorizontal: size * 0.06,
                paddingVertical: size * 0.04,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: font,
                fontSize: size,
                color: isInverted ? theme.color.paper : theme.color.paper,
                lineHeight: size * 1.05,
              }}
            >
              {isInverted ? ch.toLowerCase() : ch}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  glyphBox: {
    borderWidth: theme.border.medium,
    borderColor: theme.color.paper,
    marginHorizontal: 2,
    backgroundColor: "transparent",
  },
});
