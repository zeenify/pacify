/* CAMPAIGN — THE THIRTEEN SEATS — premium pointed tickets */
import { View, Text, Pressable, StyleSheet, Platform, Image } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { api } from "../lib/api";
import { playHover } from "../lib/sfx";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

type StudentRow = {
  id: number;
  seat: string;
  title: string;
  tier: number;
  cleared: boolean;
  attempts: number;
  wins: number;
  losses: number;
  bestScore: number;
};

export default function Campaign() {
  const [data, setData] = useState<{ students: StudentRow[]; clearedCount: number } | null>(null);

  useEffect(() => {
    api("/campaign")
      .then((d: any) => setData(d))
      .catch(() => router.replace("/"));
  }, []);

  if (!data) {
    return (
      <View style={s.stage as any}>
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>PLOTTING THE ROUTE…</Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />
      <SampleD data={data} />
    </View>
  );
}

/* ============ D — PREMIUM POINTED TICKET — rebuilt from scratch ============ */
function SampleD({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const [selected, setSelected] = useState<number | null>(null);
  const nextId = data.clearedCount + 1;

  return (
    <View style={s.dStage as any}>
      <View style={s.dHeader as any}>
        <Text style={[s.dTitle as any, web && ({ animation: "heroIn 600ms 80ms both" } as any)]}>THE THIRTEEN</Text>
        <Text style={[s.dSub as any, web && ({ animation: "heroIn 500ms 260ms both" } as any)]}>VERTEX INSTITUTE — FIRST YEAR ELITE — HOVER A SEAT</Text>
      </View>
      {web && (
        <View pointerEvents="none" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" } as any}>
          <style>{`@keyframes dChallengePop{from{opacity:0;transform:translateY(28px) skewX(-10deg) rotate(-1deg)}to{opacity:1;transform:translateY(0) skewX(-10deg) rotate(-1deg)}}@keyframes cardToChallenge{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-16px) scale(1.04)}100%{transform:translateY(-12px) scale(1)}}`}</style>
        </View>
      )}

      <View style={s.dRow as any}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          const locked = st.id > Math.max(nextId, 3);
          const isRealAsset = [1, 2, 3].includes(st.id);
          const uri =
            st.id === 1
              ? "/students/2clubs9x16.png"
              : st.id === 2
                ? "/students/3clubs.png"
                : st.id === 3
                  ? "/students/4clubs.png"
                  : "/students/2clubs9x16.png";

          const isActive = selected === st.id;
          const rankLabel = (() => {
            const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
            return ranks[st.id - 1] ?? String(st.id);
          })();
          return (
            <Pressable
              key={st.id}
              onPress={
                !locked
                  ? () => {
                      const willSelect = selected !== st.id;
                      if (willSelect) playHover();
                      setSelected(willSelect ? st.id : null);
                    }
                  : undefined
              }
              style={[
                s.dWrap as any,
                isActive && (s.dWrapHovered as any),
                web && ({ animation: `jokerIn 500ms ${100 + i * 42}ms both` } as any),
              ]}
            >
              {/* border shell — base behind image */}
              <View
                style={[
                  s.dShell as any,
                  locked && (s.dShellLocked as any),
                  st.cleared && (s.dShellCleared as any),
                  isNext && (s.dShellNext as any),
                  !locked && !isNext && !st.cleared && (s.dShellOpen as any),
                  isActive && !locked && (s.dShellHovered as any),
                ]}
                pointerEvents="none"
              >
                <View
                  style={[
                    s.dFill as any,
                    locked && (s.dFillLocked as any),
                    st.cleared && (s.dFillCleared as any),
                    isNext && (s.dFillNext as any),
                  ]}
                >
                  <View style={s.dHighlight as any} pointerEvents="none" />
                </View>
                <View style={[s.dRivet as any, s.dRivetTop as any]} pointerEvents="none" />
                <View style={[s.dRivet as any, s.dRivetBottom as any]} pointerEvents="none" />
              </View>

              {/* character — single image ON TOP of the border */}
              <View
                style={[
                  s.dImageOnTop as any,
                  isActive && !locked && ({ transform: [{ translateY: -12 }] } as any),
                ]}
                pointerEvents="none"
              >
                <Image
                  source={{ uri }}
                  style={[
                    s.dImg as any,
                    st.id === 2 ? (s.dImg3Cropped as any) : (s.dImgCropped as any),
                    st.id === 2 && (s.dImg3Small as any),
                    !isActive && locked && (s.dImgSilhouette as any),
                    !isActive && !locked && (s.dImgGrayed as any),
                    st.id === 2 && !isActive && !locked && (s.dImg3SmallSilhouette as any),
                    st.id === 2 && !isActive && locked && (s.dImg3SmallSilhouette as any),
                    isActive && (s.dImgPop as any),
                    st.id === 2 && isActive && (s.dImg3SmallPop as any),
                    locked && !isActive && ({ opacity: 0.28 } as any),
                  ]}
                  resizeMode="contain"
                />
              </View>

              {/* bottom mask — opaque layer on top of image, hides feet under it */}
              <View
                style={[
                  s.dBottomMask as any,
                  locked && (s.dShellLocked as any),
                  st.cleared && (s.dShellCleared as any),
                  isNext && (s.dShellNext as any),
                  isActive && !locked && (s.dShellHovered as any),
                ]}
                pointerEvents="box-none"
              >
                <View
                  style={[
                    s.dBottomMaskInner as any,
                    locked && (s.dFillLocked as any),
                    st.cleared && (s.dFillCleared as any),
                    isNext && (s.dFillNext as any),
                  ]}
                  pointerEvents="none"
                />
                {/* center of lower-half — 2♣ when idle, CHALLENGE when popped */}
                <View style={s.dChallengeOnBorder as any} pointerEvents="box-none">
                  {isActive && !locked ? (
                    <Pressable
                      onPress={() => {
                        playHover();
                      }}
                      style={({ pressed, hovered }: any) => [
                        hovered && ({ transform: [{ scale: 1.06 }] } as any),
                        pressed && ({ transform: [{ scale: 0.94 }] } as any),
                      ]}
                    >
                      {({ hovered, pressed }: any) => (
                        <View
                          style={[
                            s.dChallengeOnBorderBtn as any,
                            s.dChallengePopIn as any,
                            hovered && (s.dChallengeOnBorderBtnHovered as any),
                            pressed && (s.dChallengeOnBorderBtnPressed as any),
                          ]}
                        >
                          <Text style={s.dChallengeOnBorderTxt as any}>
                            {st.cleared ? "REMATCH" : "CHALLENGE "}
                            <Text style={s.dChallengeArrow as any}>▶</Text>
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ) : (
                    <View style={s.dClubsBadge as any} pointerEvents="none">
                      <Text style={s.dClubsNum as any}>{rankLabel}</Text>
                      <Text style={s.dClubsSymbol as any}>♣</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* status badges — behind image when popped so it doesn't cover */}
              <View style={[s.dContent as any, { top: 54, zIndex: isActive ? 0 : 10 } as any]} pointerEvents="none">
                {locked && (
                  <View style={s.dLockBadge as any}>
                    <Text style={s.dLockTxt as any}>LOCKED</Text>
                  </View>
                )}
                {st.cleared && !locked && (
                  <View style={s.dClearedBadge as any}>
                    <Text style={s.dClearedTxt as any}>PACIFIED</Text>
                  </View>
                )}
                {isNext && !st.cleared && !locked && (
                  <View style={s.dNextBadge as any}>
                    <Text style={s.dNextTxt as any}>TARGET</Text>
                  </View>
                )}
                {!locked && !isNext && !st.cleared && (
                  <View style={s.dOpenBadge as any}>
                    <Text style={s.dOpenTxt as any}>OPEN</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CLIP = "polygon(50% 0%, 90% 4%, 100% 8%, 100% 92%, 90% 96%, 50% 100%, 10% 96%, 0% 92%, 0% 8%, 10% 4%)";
// Bottom half matches CLIP exactly — top is opened to -40% so head/shoulders can extend above the red frame
const CLIP_BOTTOM = "polygon(0% -40%, 100% -40%, 100% 92%, 90% 96%, 50% 100%, 10% 96%, 0% 92%)";
const CLIP_BOTTOM_HALF = "polygon(0% 50%, 100% 50%, 100% 92%, 90% 96%, 50% 100%, 10% 96%, 0% 92%)";

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,
  loadingTxt: { fontFamily: theme.font.display, fontSize: 32, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,

  /* D — premium ticket */
  dStage: { flex: 1, paddingHorizontal: "1.4%", paddingTop: 72, paddingBottom: 22, zIndex: 2 } as any,
  dHeader: { alignItems: "center", marginBottom: 18 } as any,
  dTitle: { fontFamily: theme.font.display, fontSize: 58, color: theme.color.paper, letterSpacing: 5, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  dSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  dRow: { flexDirection: "row", gap: 8, height: 580, alignItems: "flex-end", justifyContent: "center" } as any,
  dWrap: {
    flex: 1,
    height: 580,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
    position: "relative",
    ...(web ? ({ transition: "flex 520ms cubic-bezier(0.16,1,0.3,1)" } as any) : {}),
  } as any,
  dWrapHovered: { flex: 2.05 } as any,

  dShell: {
    width: "100%",
    height: 540,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    paddingTop: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    ...(web
      ? ({
          clipPath: CLIP,
          transition: "transform 480ms cubic-bezier(0.16,1,0.3,1), background-color 240ms, box-shadow 240ms",
        } as any)
      : {}),
  } as any,
  dShellHovered: {
    backgroundColor: theme.color.crimson,
    transform: [{ translateY: -12 }],
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    ...(web ? ({ animation: "cardToChallenge 520ms cubic-bezier(0.16,1,0.3,1) both" } as any) : {}),
  } as any,
  dShellLocked: { backgroundColor: "#0a0a0a", opacity: 0.96 } as any,
  dShellNext: { backgroundColor: "#2e0a0a", shadowColor: theme.color.crimson, shadowOpacity: 0.25, shadowRadius: 14 } as any,
  dShellOpen: { backgroundColor: "#2e2d0a", shadowColor: theme.color.yellow, shadowOpacity: 0.18, shadowRadius: 10 } as any,
  dShellCleared: { backgroundColor: "#1e1a00" } as any,

  dFill: {
    ...StyleSheet.absoluteFillObject,
    top: 2.5,
    left: 2.5,
    right: 2.5,
    bottom: 2.5,
    backgroundColor: "#0c0c0c",
    alignItems: "center",
    paddingTop: 14,
    ...(web
      ? ({
          clipPath: CLIP,
          backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, transparent 22%, transparent 80%, rgba(230,0,18,0.07) 100%)",
        } as any)
      : {}),
  } as any,
  dFillLocked: { backgroundColor: "#0a0a0a" } as any,
  dFillNext: { backgroundColor: "#120a0a" } as any,
  dFillCleared: { backgroundColor: "#121000" } as any,

  dHighlight: {
    position: "absolute",
    top: 0,
    left: "8%",
    right: "8%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  } as any,

  dRivet: {
    position: "absolute",
    left: "50%",
    width: 8,
    height: 8,
    marginLeft: -4,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    transform: [{ rotate: "45deg" }],
    zIndex: 6,
  } as any,
  dRivetTop: { top: 4 } as any,
  dRivetBottom: { bottom: 4 } as any,

  dSeatNum: { fontFamily: theme.font.body, fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,0.32)", fontWeight: "800", zIndex: 2 } as any,
  dSeatNumHovered: { color: theme.color.yellow } as any,
  dLockBadge: { marginTop: 10, backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate: "-6deg" }], zIndex: 2 } as any,
  dLockTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.45)", fontWeight: "800" } as any,
  dClearedBadge: { marginTop: 10, backgroundColor: theme.color.yellow, borderWidth: 1, borderColor: theme.color.black, paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate: "-4deg" }], zIndex: 2 } as any,
  dClearedTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1.5, color: theme.color.black, fontWeight: "900" } as any,
  dNextBadge: { marginTop: 10, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#000", paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate: "4deg" }, { skewX: "-6deg" }], zIndex: 2, shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 } } as any,
  dNextTxt: { fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2, color: theme.color.paper, fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  dOpenBadge: { marginTop: 10, backgroundColor: theme.color.yellow, borderWidth: 2, borderColor: "#000", paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate: "-2deg" }, { skewX: "-6deg" }], zIndex: 2, shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 } } as any,
  dOpenTxt: { fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2, color: "#000", fontWeight: "900", textShadow: "1px 1px 0 rgba(255,255,255,0.6)" } as any,

  dImgWrap: {
    ...StyleSheet.absoluteFillObject,
    top: 2.5,
    left: 2.5,
    right: 2.5,
    bottom: 2.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
    ...(web ? ({ clipPath: CLIP } as any) : {}),
  } as any,
  dImgWrapPop: {
    ...(web ? ({ clipPath: CLIP_BOTTOM } as any) : {}),
  } as any,
  dContent: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  } as any,
  dImg: {
    width: "116%",
    height: "116%",
    ...(web
      ? ({
          objectFit: "contain",
          objectPosition: "50% 42%",
          transition: "transform 600ms cubic-bezier(0.16,1,0.3,1), filter 600ms cubic-bezier(0.16,1,0.3,1), opacity 380ms",
        } as any)
      : {}),
  } as any,
  dImgSilhouette: {
    transform: [{ scale: 2.0 }, { translateY: 16 }],
    ...(web
      ? ({
          filter: "brightness(0.10) contrast(1.06) drop-shadow(0 0 10px rgba(255,255,255,0.18))",
          opacity: 0.92,
        } as any)
      : { opacity: 0.34 }),
  } as any,
  dImgGrayed: {
    transform: [{ scale: 2.0 }, { translateY: 16 }],
    ...(web
      ? ({
          filter: "grayscale(1) brightness(0.72) contrast(1.05) drop-shadow(0 0 10px rgba(255,255,255,0.14))",
          opacity: 0.90,
        } as any)
      : { opacity: 0.60 }),
  } as any,
  dImgPop: {
    transform: [{ scale: 1.80 }, { translateY: 10 }],
    ...(web ? ({ filter: "brightness(1) contrast(1.04) drop-shadow(4px 4px 0 #E60012)" } as any) : { opacity: 1 }),
  } as any,
  dImgCropped: {
    ...(web ? ({ clipPath: "inset(0 0 34% 0)" } as any) : {}),
  } as any,
  dImg3Cropped: {
    ...(web ? ({ clipPath: "inset(0 0 17% 0)" } as any) : {}),
  } as any,
  dImg3Small: {
    width: "100%",
    height: "100%",
  } as any,
  dImg3SmallSilhouette: {
    transform: [{ scale: 1.60 }, { translateY: -8 }],
  } as any,
  dImg3SmallPop: {
    transform: [{ scale: 1.40 }, { translateY: -12 }],
  } as any,
  dImageOnTop: {
    position: "absolute",
    top: 42.5,
    left: 2.5,
    right: 2.5,
    bottom: 2.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 1,
    ...(web ? ({ transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)" } as any) : {}),
  } as any,
  dBottomMask: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 270,
    backgroundColor: "#1e1e1e",
    zIndex: 2,
    ...(web ? ({ clipPath: CLIP_BOTTOM_HALF } as any) : {}),
  } as any,
  dBottomMaskInner: {
    ...StyleSheet.absoluteFillObject,
    top: 2.5,
    left: 2.5,
    right: 2.5,
    bottom: 2.5,
    backgroundColor: "#0c0c0c",
    ...(web ? ({ clipPath: CLIP_BOTTOM_HALF } as any) : {}),
  } as any,
  dChallengeOnBorder: {
    position: "absolute",
    top: "75%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 3,
    ...(web ? ({ transform: "translateY(-50%)", transition: "transform 200ms ease" } as any) : {}),
  } as any,
  dChallengeOnBorderBtn: {
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 14,
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }],
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 6 },
    ...(web
      ? ({
          transition: "transform 180ms cubic-bezier(0.16,1,0.3,1), background-color 180ms ease, box-shadow 180ms ease, filter 180ms ease",
          boxShadow: "0 0 0 4px #000, 6px 6px 0 #000",
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.12) 5px 10px), linear-gradient(180deg, #E60012 0%, #b8000f 100%)",
        } as any)
      : {}),
  } as any,
  dChallengeOnBorderBtnHovered: {
    backgroundColor: "#ff1a2a",
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }, { scale: 1.08 }],
    ...(web ? ({ boxShadow: "0 0 0 4px #000, 8px 8px 0 #000", filter: "brightness(1.1) saturate(1.2)" } as any) : {}),
  } as any,
  dChallengeOnBorderBtnPressed: {
    backgroundColor: "#90000c",
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }, { scale: 0.95 }],
    ...(web ? ({ boxShadow: "0 0 0 4px #000, 2px 2px 0 #000", filter: "brightness(0.95)" } as any) : {}),
  } as any,
  dChallengeOnBorderTxt: {
    fontFamily: theme.font.display,
    fontSize: 18,
    letterSpacing: 2.5,
    color: theme.color.paper,
    fontWeight: "900",
    textShadow: "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
    transform: [{ skewX: "10deg" }],
  } as any,
  dChallengeArrow: {
    fontFamily: theme.font.display,
    fontSize: 14,
    color: theme.color.yellow,
    textShadow: "2px 2px 0 #000",
    transform: [{ skewX: "10deg" }],
  } as any,
  dChallengePopIn: {
    ...(web ? ({ animation: "dChallengePop 480ms cubic-bezier(0.16,1,0.3,1) both" } as any) : {}),
  } as any,
  dClubsBadge: {
    backgroundColor: theme.color.paper,
    borderWidth: 3,
    borderColor: "#000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }],
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    ...(web
      ? ({
          boxShadow: "0 0 0 3px #000, 4px 4px 0 #000",
          backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.06) 4px 8px)",
        } as any)
      : {}),
  } as any,
  dClubsNum: {
    fontFamily: theme.font.display,
    fontSize: 28,
    lineHeight: 28,
    color: "#000",
    fontWeight: "900",
    textShadow: "2px 2px 0 #E60012",
    transform: [{ skewX: "10deg" }],
  } as any,
  dClubsSymbol: {
    fontFamily: theme.font.display,
    fontSize: 26,
    lineHeight: 26,
    color: "#000",
    marginTop: -2,
    transform: [{ skewX: "10deg" }],
  } as any,

  dSeatLabel: { marginTop: 12, fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, color: "rgba(255,255,255,0.32)", fontWeight: "800", textAlign: "center" } as any,
  dSeatLabelHovered: { color: theme.color.paper } as any,
  dHoverBar: { marginTop: 7, backgroundColor: theme.color.crimson, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  dHoverBarTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: theme.color.paper, fontWeight: "900" } as any,
  dFoot: { marginTop: 18, textAlign: "center", fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.28)" } as any,
});
