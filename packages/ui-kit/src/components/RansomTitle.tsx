import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

const GLYPH_FONTS: string[] = ["Archivo Black", "Anton", "Syne"];

/**
 * PACIFY — Persona 5 logotype.
 * Not a website header: ransom letters with hard offset shadow, ink outline, crimson drop.
 * Each glyph tilted, one inverted in crimson box — but now with P5 extrusion.
 */
export function RansomTitle({ text, size = 72 }: { text: string; size?: number }) {
  const invertIdx = Math.floor(text.length / 2);
  return (
    <View style={styles.row} accessible={false}>
      {text.split("").map((ch, i) => {
        if (ch === " ") return <View key={i} style={{ width: size * 0.35 }} />;
        const font = GLYPH_FONTS[i % GLYPH_FONTS.length];
        const tilt = ((i * 9) % 12) - 6; // -6..+6 more punch than before
        const isInverted = i === invertIdx;
        return (
          <View
            key={i}
            style={[
              styles.glyphBox,
              isInverted && styles.inverted,
              {
                transform: [{ rotate: `${tilt}deg` }],
                paddingHorizontal: size * 0.05,
                paddingVertical: size * 0.02,
                // P5 hard shadow as border offset — not CSS boxShadow
                marginRight: 2,
              } as any,
            ]}
          >
            {/* extrusion shadow layer */}
            <View style={[styles.extrusion, { top: 4, left: 4 }]} />
            <Text
              style={{
                fontFamily: font,
                fontSize: size,
                color: theme.color.paper,
                lineHeight: size * 1,
                letterSpacing: -size * 0.02,
                // outline via textShadow (RN web supports)
                textShadowColor: theme.color.pureBlack,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 0,
              } as any}
            >
              {/* fake outline by stacking shadows */}
              <Text
                style={{
                  color: isInverted ? theme.color.paper : theme.color.paper,
                  textShadowColor: "#000",
                  textShadowOffset: { width: 3, height: 3 },
                  textShadowRadius: 0,
                } as any}
              >
                {isInverted ? ch.toLowerCase() : ch}
              </Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  } as any,
  glyphBox: {
    borderWidth: theme.border.medium,
    borderColor: theme.color.paper,
    backgroundColor: theme.color.black,
    overflow: "visible",
  } as any,
  inverted: {
    backgroundColor: theme.color.crimson,
    borderColor: theme.color.paper,
    transform: [{ rotate: "-2deg" }],
  } as any,
  extrusion: {
    position: "absolute",
    inset: 0,
    backgroundColor: theme.color.crimson,
    zIndex: -1,
    opacity: 0.95,
  } as any,
});
