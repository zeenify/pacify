/* SpeakerToggle — custom-drawn speaker chip, fixed to the corner of EVERY
   screen. Click to kill/restore all sound (persisted with your options).
   Muted state: speaker goes hollow + crimson slash slams across. */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useState } from "react";
import { theme } from "@pacify/ui-kit";
import { playHover } from "../lib/sfx";
import { DEFAULT_OPTIONS, loadOptions, saveOptions, applyOptions } from "../lib/options";

const web = Platform.OS === "web";

export function SpeakerToggle() {
  const [on, setOn] = useState(DEFAULT_OPTIONS.sfxOn);

  useEffect(() => {
    setOn(loadOptions().sfxOn);
  }, []);

  function flip() {
    const next = !on;
    setOn(next);
    const o = loadOptions();
    const merged = { ...o, sfxOn: next };
    saveOptions(merged);
    applyOptions(merged);
    if (next) playHover(); // confirm blip when unmuting
  }

  return (
    <Pressable
      onPress={flip}
      style={({ hovered }) => [
        s.chip as any,
        hovered && (s.chipHov as any),
        web && ({ transition: "transform 150ms cubic-bezier(0.175,0.885,0.32,1.275)" } as any),
      ]}
    >
      {/* speaker body — cone + box via clip-path */}
      <View style={s.iconWrap as any}>
        <View style={[s.spkBox as any, !on && (s.spkOff as any)]} />
        <View style={[s.spkCone as any, !on && (s.spkOff as any)]} />
        {/* sound waves — only when on */}
        {on && (
          <>
            <View style={[s.wave as any, { right: 9, width: 7, height: 14 } as any]} />
            <View style={[s.wave as any, { right: 3, width: 7, height: 22 } as any]} />
          </>
        )}
        {/* mute slash */}
        {!on && <View style={s.slash as any} />}
      </View>
      <Text style={[s.txt as any, !on && (s.txtOff as any)]}>{on ? "SOUND" : "MUTED"}</Text>
    </Pressable>
  );
}

const SPK_CLIP = "polygon(0% 35%, 40% 35%, 78% 8%, 78% 92%, 40% 65%, 0% 65%)";

const s = StyleSheet.create({
  chip: {
    position: "absolute",
    bottom: 18,
    right: 18,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.color.black,
    borderWidth: 2,
    borderColor: "#2d2d2d",
    paddingVertical: 9,
    paddingHorizontal: 13,
    transform: [{ skewX: "-8deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 0,
    shadowOffset: { width: 5, height: 5 },
  } as any,
  chipHov: {
    borderColor: theme.color.crimson,
    transform: [{ skewX: "-8deg" }, { translateX: -2 }, { translateY: -2 }],
    shadowOffset: { width: 7, height: 7 },
  } as any,

  iconWrap: { width: 30, height: 26, justifyContent: "center" } as any,
  spkBox: { position: "absolute", left: 0, top: 8, width: 9, height: 10, backgroundColor: theme.color.paper } as any,
  spkCone: {
    position: "absolute",
    left: 7,
    top: 1,
    width: 17,
    height: 24,
    backgroundColor: theme.color.paper,
    ...(web ? ({ clipPath: "polygon(0% 28%, 100% 0%, 100% 100%, 0% 72%)" } as any) : {}),
  } as any,
  spkOff: { backgroundColor: "#4a4a4a" } as any,

  wave: {
    position: "absolute",
    top: 2,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderBottomRightRadius: 12,
    borderTopRightRadius: 12,
    borderLeftWidth: 0,
    borderColor: theme.color.yellow,
  } as any,

  slash: {
    position: "absolute",
    left: -3,
    right: -6,
    top: "50%",
    height: 3.5,
    marginTop: -2,
    backgroundColor: theme.color.crimson,
    transform: [{ rotate: "-38deg" }],
  } as any,

  txt: { fontFamily: theme.font.display, fontSize: 13, letterSpacing: 2, color: theme.color.paper } as any,
  txtOff: { color: "#666" } as any,
});
