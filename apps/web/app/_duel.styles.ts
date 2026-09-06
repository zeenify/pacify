/* DUEL — all styles + keyframes for the duel screen. The component lives in
   duel.tsx; this module is route-exempt (underscore prefix). */
import { StyleSheet, Platform } from "react-native";
import { theme } from "@pacify/ui-kit";

const web = Platform.OS === "web";

const DESIGN_W = 1600;
const DESIGN_H = 900;
const TABLE_CLIP = "polygon(13% 0%, 87% 0%, 100% 100%, 0% 100%)";

const SHIELD_CLIP = "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 0% 60%, 0% 11%)";
const SHIELD_CLIP_L = "polygon(50% 0%, 56% 9%, 47% 26%, 54% 45%, 46% 64%, 53% 82%, 50% 100%, 0% 60%, 0% 11%)";
const SHIELD_CLIP_R = "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 55.5% 82%, 48.5% 64%, 56.5% 45%, 49.5% 26%, 58.5% 9%)";

/* Irregular comic starburst — P5 sticker verdict shape (black offset layer + colored face). */
const BURST_CLIP = "polygon(50% 0%, 60% 11%, 76% 4%, 79% 20%, 96% 22%, 88% 37%, 100% 48%, 86% 57%, 93% 72%, 76% 71%, 73% 88%, 58% 78%, 46% 94%, 39% 78%, 22% 85%, 25% 67%, 6% 63%, 19% 51%, 4% 38%, 21% 34%, 16% 17%, 34% 21%, 41% 5%)";

export const st = StyleSheet.create({
  /* the window fills; the 1600x900 stage inside scales to fit */
  viewport: { flex: 1, backgroundColor: "#080808", overflow: "hidden" } as any,
  stage: {
    position: "absolute", left: "50%", top: "50%", width: DESIGN_W, height: DESIGN_H,
    marginLeft: -DESIGN_W / 2, marginTop: -DESIGN_H / 2,
    backgroundColor: "#080808", overflow: "hidden",
  } as any,

  /* backdrop */
  backStripes: {
    ...StyleSheet.absoluteFillObject,
    ...(web ? ({
      backgroundImage:
        "repeating-linear-gradient(115deg, transparent 0 160px, rgba(230,0,18,0.05) 160px 190px), repeating-linear-gradient(65deg, transparent 0 220px, rgba(252,238,33,0.025) 220px 240px)",
    } as any) : {}),
  } as any,
  backDots: {
    ...StyleSheet.absoluteFillObject,
    ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1.6px)", backgroundSize: "9px 9px" } as any) : {}),
  } as any,

  /* intro splash */
  introWrap: { ...StyleSheet.absoluteFillObject, zIndex: 60, alignItems: "center", justifyContent: "center" } as any,
  introPanel: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson, transform: [{ skewX: "-14deg" }], borderLeftWidth: 14, borderRightWidth: 14, borderColor: "#000" } as any,
  introTxt: { fontFamily: theme.font.display, fontSize: 120, color: "#fff", letterSpacing: 10, textShadow: "10px 10px 0 #000" } as any,

  /* HUD stickers */




  /* ---------- opponent zone ---------- */
  oppZone: { height: "31%", alignItems: "center", justifyContent: "flex-end", zIndex: 10 } as any,
  oppFrameBack: {
    position: "absolute", bottom: -8, width: 360, height: "88%", backgroundColor: "#0d0d0d",
    borderWidth: 4, borderColor: "#1c1c1c", transform: [{ rotate: "-2deg" }],
    ...(web ? ({ boxShadow: "14px 14px 0 rgba(230,0,18,0.16)", clipPath: "polygon(6% 0%, 94% 2%, 100% 100%, 0% 97%)" } as any) : {}),
  } as any,
  oppPortraitWrap: { position: "absolute", bottom: 0, height: "88%", justifyContent: "flex-end", alignItems: "center", zIndex: 1 } as any,
  oppPortrait: { width: 340, height: "100%", ...(web ? ({ filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.85))" } as any) : {}) } as any,
  oppNameplate: {
    position: "absolute", bottom: 10, left: "50%", marginLeft: -170, zIndex: 3, flexDirection: "row", alignItems: "baseline", gap: 12,
    backgroundColor: "#000", borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 22, paddingVertical: 7,
    transform: [{ rotate: "-2.5deg" }, { skewX: "-10deg" }],
    ...(web ? ({ boxShadow: "5px 5px 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  oppNameTxt: { fontFamily: theme.font.display, fontSize: 32, color: "#fff", letterSpacing: 4, textShadow: "2px 2px 0 rgba(230,0,18,0.9)" } as any,
  oppRankTxt: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow } as any,
  oppFan: { position: "absolute", top: "5%", left: "50%", marginLeft: -150, width: 300, height: 46, flexDirection: "row", justifyContent: "center", zIndex: 0 } as any,
  oppFanCard: {
    width: 32, height: 44, marginLeft: -14, borderRadius: 4, backgroundColor: theme.color.crimson,
    borderWidth: 2, borderColor: "rgba(0,0,0,0.85)", opacity: 0.92, ...(web ? ({ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0 4px, transparent 4px 8px)", boxShadow: "2px 2px 0 rgba(0,0,0,0.6)" } as any) : {}),
  } as any,
  bubble: {
    position: "absolute", left: "50%", marginLeft: 185, top: "12%", maxWidth: 400, zIndex: 20,
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18,
    ...(web ? ({ boxShadow: "7px 7px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  bubbleTail: {
    position: "absolute", left: -12, top: 30, width: 22, height: 22, backgroundColor: "#000",
    borderLeftWidth: 3, borderBottomWidth: 3, borderColor: "#fff", transform: [{ rotate: "45deg" }],
  } as any,
  bubbleTag: { position: "absolute", top: -16, left: 14, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#000", paddingHorizontal: 10, paddingVertical: 2, transform: [{ rotate: "-3deg" }], zIndex: 2 } as any,
  bubbleTagTxt: { fontFamily: theme.font.display, fontSize: 13, color: "#fff", letterSpacing: 2 } as any,
  bubbleTxt: { fontFamily: theme.font.body, fontSize: 19, color: "#fff", fontStyle: "italic", lineHeight: 27, textShadow: "1px 1px 0 rgba(0,0,0,0.9)" } as any,
  bubbleDotsRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8 } as any,
  bubbleDot: { width: 14, height: 14, borderRadius: 999, backgroundColor: theme.color.yellow } as any,

  /* ---------- table — runs from below Klein to the very bottom of the screen ---------- */
  tableZone: { flex: 1, alignItems: "center", zIndex: 20 } as any,
  tableRim: {
    width: "92%", height: "100%", backgroundColor: "#2b2019", borderWidth: 4, borderColor: "#000",
    ...(web ? ({
      clipPath: TABLE_CLIP,
      backgroundImage: "linear-gradient(180deg, #7a5432 0%, #43301c 7%, #241a10 26%, #1a120a 55%, #2e2012 82%, #6b4a2a 94%, #a3763f 100%)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
    } as any) : {}),
  } as any,
  tableFelt: {
    ...StyleSheet.absoluteFillObject, top: 22, left: 22, right: 22, bottom: 16,
    backgroundColor: "#1c0d0f",
    ...(web ? ({
      clipPath: TABLE_CLIP,
      backgroundImage:
        "repeating-linear-gradient(115deg, rgba(255,255,255,0.014) 0 3px, transparent 3px 7px), radial-gradient(ellipse at 50% 22%, #55151b 0%, #3a0e13 40%, #1c0d0f 72%, #120809 100%)",
    } as any) : {}),
  } as any,
  feltLine: {
    position: "absolute", left: "16%", right: "16%", top: "50%", borderTopWidth: 2, borderStyle: "dashed",
    borderColor: "rgba(230,0,18,0.30)",
  } as any,
  roundMarker: {
    position: "absolute", left: "2%", top: "30%", width: 168, alignItems: "center",
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingVertical: 10,
    transform: [{ rotate: "-7deg" }, { skewX: "-8deg" }], zIndex: 25,
    ...(web ? ({ boxShadow: "5px 5px 0 rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  roundLbl: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 6, color: theme.color.paperDim, fontWeight: "900" } as any,
  roundNum: { fontFamily: theme.font.display, fontSize: 54, lineHeight: 56, color: "#fff", textShadow: "3px 3px 0 rgba(230,0,18,0.9)" } as any,
  roundDim: { fontSize: 28, color: theme.color.paperDim } as any,
  roundMult: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow, letterSpacing: 2 } as any,

  chip: {
    position: "absolute", width: 116, height: 116, borderRadius: 999, alignItems: "center", justifyContent: "center",
    backgroundColor: "#000", borderWidth: 3, zIndex: 25,
  } as any,
  chipOpp: { right: "5%", top: "6%", borderColor: theme.color.crimson, transform: [{ rotate: "4deg" }] } as any,
  chipYou: { left: "5%", bottom: "27%", borderColor: theme.color.yellow, transform: [{ rotate: "-4deg" }] } as any,
  chipLbl: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, color: theme.color.paperDim, fontWeight: "900", textAlign: "center" } as any,
  chipNum: { fontFamily: theme.font.display, fontSize: 48, lineHeight: 50, textShadow: "2px 2px 0 #000" } as any,

  /* executioner drain "-1" pops — anchored beside each chip, fan outward with each tick */
  drainPopOpp: { position: "absolute", right: "5%", top: "6%", width: 116, height: 116, zIndex: 30, alignItems: "center", justifyContent: "flex-start" } as any,
  drainPopYou: { position: "absolute", left: "5%", bottom: "27%", width: 116, height: 116, zIndex: 30, alignItems: "center", justifyContent: "flex-start" } as any,
  drainPopTxt: {
    fontFamily: theme.font.display, fontSize: 74, lineHeight: 74, color: theme.color.crimson,
    textShadow: "5px 5px 0 #000, 0 0 26px rgba(230,0,18,0.55)",
  } as any,

  feltSlot: { position: "absolute", left: "50%", marginLeft: -57, zIndex: 5 } as any,
  feltSlotTop: { top: "4%" } as any,
  feltSlotBottom: { top: "38%" } as any,
  playCard: {
    width: 114, height: 152, borderRadius: 9, overflow: "hidden",
    ...(web ? ({ boxShadow: "5px 7px 0 rgba(0,0,0,0.7)" } as any) : {}),
  } as any,

  back: { flex: 1, backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: theme.color.yellow, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" } as any,
  backStripeA: { ...StyleSheet.absoluteFillObject, ...(web ? ({ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.4) 0 7px, transparent 7px 16px)" } as any) : {}) } as any,
  backStripeB: { position: "absolute", left: "18%", right: "18%", top: 0, bottom: 0, borderWidth: 2, borderColor: "rgba(0,0,0,0.35)" } as any,
  backSuit: { fontSize: 30, color: "rgba(0,0,0,0.55)", fontWeight: "900", transform: [{ rotate: "-10deg" }] } as any,

  /* reveal sequence overlays */
  showdownWrap: { position: "absolute", left: "50%", top: "30%", marginLeft: -120, width: 240, alignItems: "center", zIndex: 8 } as any,
  showdownLbl: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 8, color: theme.color.yellow, fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  showdownNum: { fontFamily: theme.font.display, fontSize: 110, lineHeight: 112, color: "#fff", textShadow: "6px 6px 0 rgba(230,0,18,0.9), 3px 3px 0 #000" } as any,
  tallyPlate: {
    position: "absolute", left: -142, top: "50%", marginTop: -48, width: 124, alignItems: "center",
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingVertical: 6, zIndex: 6,
    ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  tallyLbl: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.paperDim, fontWeight: "900" } as any,
  tallyNum: { fontFamily: theme.font.display, fontSize: 48, lineHeight: 50, textShadow: "3px 3px 0 #000" } as any,
  flyBadge: { position: "absolute", width: 190, alignItems: "center", zIndex: 30 } as any,
  flyYou: { left: "37%", top: "40%" } as any,
  flyKlein: { left: "37%", top: "7%" } as any,
  flyTxt: { fontFamily: theme.font.display, fontSize: 76, lineHeight: 80, textShadow: "4px 4px 0 #000, 0 0 30px rgba(252,238,33,0.7)" } as any,

  /* shield nullify cinematic */
  shieldWrap: { position: "absolute", left: "50%", top: "16%", marginLeft: -240, width: 480, alignItems: "center", zIndex: 9, gap: 10 } as any,
  tieWrap: { position: "absolute", left: "50%", top: "27%", marginLeft: -120, width: 240, alignItems: "center", zIndex: 9 } as any,

  /* executioner takeover — full-screen All-Out-Attack stage (1600x900 design space) */
  tkRoot: { ...StyleSheet.absoluteFillObject, zIndex: 90 } as any,
  tkPanel: { ...StyleSheet.absoluteFillObject } as any,
  tkPanelL: {
    clipPath: "polygon(0 0, 60% 0, 44% 100%, 0 100%)",
    backgroundColor: "#0a0a0d",
    ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 2.2px)", backgroundSize: "10px 10px", boxShadow: "inset -14px 0 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  tkPanelR: {
    clipPath: "polygon(60% 0, 100% 0, 100% 100%, 44% 100%)",
    backgroundColor: "#120609",
    ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 2.2px)", backgroundSize: "10px 10px", boxShadow: "inset 14px 0 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  tkSlash: {
    position: "absolute", left: "51%", top: "-5%", width: 10, height: "110%", backgroundColor: "#fff",
    ...(web ? ({ boxShadow: "0 0 26px rgba(255,255,255,0.9)" } as any) : {}),
  } as any,
  tkContent: { ...StyleSheet.absoluteFillObject, alignItems: "center" } as any,
  tkStripes: {
    position: "absolute", left: "-20%", right: "-20%", top: "42%", height: 130, opacity: 0.14,
    transform: [{ rotate: "-12deg" }],
    ...(web ? ({
      backgroundImage: "repeating-linear-gradient(90deg, rgba(252,238,33,0.9) 0 10px, transparent 10px 26px)",
      backgroundSize: "84px 100%", animation: "dStripe 900ms linear infinite",
    } as any) : {}),
  } as any,
  tkKicker: {
    position: "absolute", top: 44, fontFamily: theme.font.body, fontSize: 24, letterSpacing: 10,
    color: theme.color.paperDim, fontWeight: "900", textShadow: "2px 2px 0 #000",
  } as any,
  tkNumWrap: { position: "absolute", left: 0, right: 0, height: 250, alignItems: "center", justifyContent: "center", ...(web ? ({ perspective: 900 } as any) : {}) } as any,
  tkNum: { fontFamily: theme.font.display, fontSize: 236, lineHeight: 244, textShadow: "10px 10px 0 rgba(0,0,0,0.85)" } as any,
  tkNumHalf: { position: "absolute", fontSize: 236, lineHeight: 244, textShadow: "10px 10px 0 rgba(0,0,0,0.85)" } as any,
  tkNumHalfA: { ...(web ? ({ clipPath: "polygon(0 0, 100% 0, 100% 44%, 0 56%)" } as any) : {}) } as any,
  tkNumHalfB: { ...(web ? ({ clipPath: "polygon(0 56%, 100% 44%, 100% 100%, 0 100%)" } as any) : {}) } as any,
  tkCutLine: {
    position: "absolute", left: -80, right: -80, top: "52%", height: 8, backgroundColor: "#fff",
    ...(web ? ({ boxShadow: "0 0 30px rgba(255,255,255,0.95)" } as any) : {}),
  } as any,

  /* the rig — a proper guillotine: two grooved uprights capped by a beam,
     pulley + rope on top, weighted mouton with the angled blade below it */
  tkGuillotine: { position: "absolute", left: "50%", marginLeft: -240, top: 100, width: 480, height: 560, pointerEvents: "none" } as any,
  tkPostG: {
    position: "absolute", left: 0, top: 60, width: 34, height: 460, backgroundColor: "#141419", borderWidth: 3, borderColor: "#2c2c36",
    ...(web ? ({ backgroundImage: "repeating-linear-gradient(180deg, #1d1d24 0 22px, #0b0b0e 22px 30px)" } as any) : {}),
  } as any,
  tkCap: {
    position: "absolute", left: -26, top: 14, width: 532, height: 44, backgroundColor: "#17171d", borderWidth: 3, borderColor: "#2c2c36",
    ...(web ? ({ backgroundImage: "linear-gradient(180deg, #26262e 0%, #101014 100%)", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" } as any) : {}),
  } as any,
  tkPulley: { position: "absolute", left: 218, top: 30, width: 44, height: 44, ...(web ? ({ backgroundImage: "radial-gradient(circle at 35% 30%, #3a3a44, #101014 70%)", borderWidth: 3, borderColor: "#2c2c36" } as any) : {}) } as any,
  tkWheel: {
    position: "absolute", left: 8, top: 8, right: 8, bottom: 8, borderRadius: 999, backgroundColor: "#0c0c10",
    ...(web ? ({ backgroundImage: "conic-gradient(#565666 0 12.5%, #14141a 12.5% 25%, #565666 25% 37.5%, #14141a 37.5% 50%, #565666 50% 62.5%, #14141a 62.5% 75%, #565666 75% 87.5%, #14141a 87.5% 100%)" } as any) : {}),
  } as any,
  tkRope: {
    position: "absolute", left: 236, top: 58, width: 8, height: 96, backgroundColor: "#c9b48a",
    ...(web ? ({ boxShadow: "inset 0 0 3px rgba(0,0,0,0.6), 1px 1px 2px rgba(0,0,0,0.5)", transformOrigin: "50% 0%" } as any) : {}),
  } as any,
  tkMouton: {
    position: "absolute", left: 47, top: 150, width: 386, height: 88,
    ...(web ? ({
      backgroundImage: "linear-gradient(180deg, #3c3c46 0%, #23232b 30%, #14141a 100%)",
      borderWidth: 3, borderColor: "#050507",
      boxShadow: "0 14px 30px rgba(0,0,0,0.85), inset 0 4px 0 rgba(255,255,255,0.14)",
    } as any) : {}),
  } as any,
  tkMoutonRivets: {
    position: "absolute", left: 0, right: 0, top: 12, height: 14,
    ...(web ? ({ backgroundImage: "radial-gradient(circle, #6a6a78 2px, #191920 2.6px) 14px 14px", backgroundSize: "42px 14px", backgroundRepeat: "repeat-x" } as any) : {}),
  } as any,
  tkEdge: {
    position: "absolute", left: -6, right: -6, bottom: -46, height: 52,
    ...(web ? ({
      clipPath: "polygon(0 22%, 100% 0, 100% 100%, 0 100%)",
      backgroundImage: "linear-gradient(175deg, #e8ecf2 0%, #aab2bf 35%, #4a5058 60%, #23262c 100%)",
      boxShadow: "inset 0 -6px 0 rgba(230,0,18,0.55), 0 12px 26px rgba(0,0,0,0.8)",
    } as any) : {}),
  } as any,
  tkBaschet: {
    position: "absolute", left: 26, top: 508, width: 428, height: 34,
    ...(web ? ({ backgroundImage: "linear-gradient(180deg, #20202a 0%, #0b0b0e 100%)", borderWidth: 3, borderColor: "#050507", boxShadow: "0 10px 24px rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  tkVerdict: { position: "absolute", left: "50%", marginLeft: -390, width: 780, height: 200, alignItems: "center", justifyContent: "center", zIndex: 3 } as any,
  tkBurst: { ...StyleSheet.absoluteFillObject, ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: "#000" } as any) : {}) } as any,
  tkBurstB: { ...StyleSheet.absoluteFillObject, marginLeft: 10, marginTop: 12, ...(web ? ({ clipPath: BURST_CLIP } as any) : {}) } as any,
  tkBurstW: { ...StyleSheet.absoluteFillObject, marginLeft: 5, marginTop: 6, ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: "#fff" } as any) : {}) } as any,
  tkLetters: { flexDirection: "row", alignItems: "center", ...(web ? ({ perspective: 700 } as any) : {}) } as any,
  tkLetter: { fontFamily: theme.font.display, lineHeight: 82, textShadow: "4px 4px 0 rgba(0,0,0,0.35)", marginHorizontal: 2 } as any,
  tkZero: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 4, marginTop: 2 } as any,
  /* misfire → the sentencing meter under the blade: fill = target power,
     crimson-striped zone past 7 = where the blade would drop */
  tkMeterWrap: { position: "absolute", top: 110, left: "50%", marginLeft: -400, width: 800, alignItems: "center", gap: 12, zIndex: 2 } as any,
  tkMeterLbl: { fontFamily: theme.font.body, fontSize: 22, letterSpacing: 8, color: "#fff", fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  tkMeterBar: {
    position: "relative", width: 800, height: 64, backgroundColor: "#0a0a0d", borderWidth: 4, borderColor: "#fff",
    ...(web ? ({ boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  tkMeterZone: {
    position: "absolute", right: 0, top: 0, bottom: 0, width: "41.67%",
    ...(web ? ({
      backgroundImage: "repeating-linear-gradient(45deg, rgba(230,0,18,0.55) 0 12px, rgba(230,0,18,0.2) 12px 24px)",
      borderLeftWidth: 4, borderLeftColor: theme.color.crimson,
    } as any) : {}),
  } as any,
  tkMeterFill: {
    position: "absolute", left: 0, top: 4, bottom: 4, backgroundColor: theme.color.yellow,
    ...(web ? ({ boxShadow: "inset 0 -10px 0 rgba(230,0,18,0.4), 0 0 24px rgba(252,238,33,0.5)" } as any) : {}),
  } as any,
  tkMeterTick: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,255,255,0.22)" } as any,
  tkMeterNum: {
    position: "absolute", top: -34, width: 44, textAlign: "center", zIndex: 3,
    fontFamily: theme.font.display, fontSize: 40, lineHeight: 42, color: "#fff", textShadow: "3px 3px 0 rgba(230,0,18,0.95)",
  } as any,
  tkMeterMet: {
    position: "absolute", top: -54, left: "50%", marginLeft: -170, width: 340, paddingVertical: 6, alignItems: "center", zIndex: 4,
    backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff",
    ...(web ? ({ boxShadow: "6px 6px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  tkMeterMetTxt: { fontFamily: theme.font.display, fontSize: 28, lineHeight: 30, letterSpacing: 2, color: "#fff", textShadow: "2px 2px 0 #000" } as any,
  tkMeterCaptionRow: { flexDirection: "row", width: 800 } as any,
  tkMeterCaptionSpacer: { flex: 1 } as any,
  tkMeterCaption: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 3, color: theme.color.paperDim, fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,

  /* ---------- VOID — maw mutation on the felt (custom 3D identity) ---------- */
  vnVignette: { ...StyleSheet.absoluteFillObject, zIndex: 6, ...(web ? ({ backgroundImage: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 100%)" } as any) : {}) } as any,
  vnPortal: { position: "absolute", left: "50%", marginLeft: -150, width: 300, height: 300, zIndex: 8 } as any,
  vnPortalTop: { top: "4%", marginTop: -74 } as any,
  vnPortalBottom: { top: "38%", marginTop: -74 } as any,
  vnPersp: { ...StyleSheet.absoluteFillObject, ...(web ? ({ perspective: 700 } as any) : {}) } as any,
  vnDisc: { ...StyleSheet.absoluteFillObject, ...(web ? ({ transform: [{ rotateX: "60deg" }] } as any) : {}) } as any,
  vnRingA: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -150, marginTop: -150, width: 300, height: 300, borderRadius: 999,
    ...(web ? ({
      // doppler beaming — the approaching (left) side burns brighter
      backgroundImage: "conic-gradient(from 0deg, rgba(230,0,18,0) 0deg, rgba(230,0,18,0.4) 170deg, rgba(255,235,225,0.95) 265deg, rgba(230,0,18,0.35) 330deg, rgba(230,0,18,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 4px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 4px))",
    } as any) : {}),
  } as any,
  vnRingB: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -115, marginTop: -115, width: 230, height: 230, borderRadius: 999,
    ...(web ? ({
      backgroundImage: "conic-gradient(from 180deg, rgba(230,0,18,0) 0deg, rgba(230,0,18,0.7) 60deg, rgba(255,255,255,0.9) 120deg, rgba(230,0,18,0.15) 200deg, rgba(230,0,18,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
    } as any) : {}),
  } as any,
  vnRingC: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -88, marginTop: -88, width: 176, height: 176, borderRadius: 999,
    ...(web ? ({
      backgroundImage: "conic-gradient(from 40deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.8) 100deg, rgba(255,255,255,0.1) 220deg, rgba(255,255,255,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))",
    } as any) : {}),
  } as any,
  vnDot: { position: "absolute", left: -2, top: -158, width: 4, height: 4, borderRadius: 4, backgroundColor: "rgba(255,214,196,0.95)" } as any,
  vnCore: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -66, marginTop: -66, width: 132, height: 132, borderRadius: 999,
    ...(web ? ({
      // the sphere — dark base volume; the orbiting shade (vnShade) supplies the light
      backgroundImage: "radial-gradient(circle at 38% 30%, #180910 0%, #0c0409 32%, #000 62%)",
      boxShadow: "0 0 34px rgba(230,0,18,0.5), 0 20px 55px rgba(0,0,0,0.65)",
    } as any) : {}),
  } as any,
  /* the sweeping light — a soft patch that GLIDES across the sphere face along a
     straight diagonal (11 o'clock → 4 o'clock), clipped by the sphere itself */
  vnShadeClip: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -66, marginTop: -66, width: 132, height: 132, borderRadius: 999, overflow: "hidden",
  } as any,
  vnShade: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -66, marginTop: -66, width: 132, height: 132,
    ...(web ? ({
      // wide, soft bloom — reads as a light REFLECTION rolling across the ball
      backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,228,206,0.65) 0%, rgba(255,198,166,0.34) 36%, rgba(255,172,142,0.12) 58%, transparent 76%)",
    } as any) : {}),
  } as any,
  /* photon ring — thin white-hot circle hugging the sphere's edge */
  vnPhoton: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -70, marginTop: -70, width: 140, height: 140, borderRadius: 999,
    borderWidth: 2, borderColor: "rgba(255,238,222,0.9)",
    ...(web ? ({ boxShadow: "0 0 14px rgba(255,190,150,0.85), inset 0 0 10px rgba(255,190,150,0.5)" } as any) : {}),
  } as any,
  /* the disk bending OVER the sphere (far side, light-lensed above the horizon) */
  vnWrapTop: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -120, marginTop: -75, width: 240, height: 150, borderRadius: "50%",
    ...(web ? ({
      backgroundImage: "conic-gradient(from 0deg, rgba(255,222,196,0) 0deg, rgba(255,224,198,0.95) 55deg, rgba(230,0,18,0.85) 115deg, rgba(255,222,196,0.15) 165deg, rgba(255,222,196,0) 195deg, rgba(255,222,196,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 2px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 2px))",
      clipPath: "polygon(0 0, 100% 0, 100% 52%, 0 52%)",
      filter: "drop-shadow(0 0 6px rgba(255,200,160,0.7))",
    } as any) : {}),
  } as any,
  /* the near side of the disk crossing IN FRONT of the sphere's lower edge */
  vnWrapFront: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -130, marginTop: -73, width: 260, height: 156, borderRadius: "50%",
    ...(web ? ({
      backgroundImage: "conic-gradient(from 0deg, rgba(255,222,196,0) 0deg, rgba(255,222,196,0) 150deg, rgba(255,236,220,0.95) 195deg, rgba(230,0,18,0.9) 255deg, rgba(255,222,196,0.2) 300deg, rgba(255,222,196,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
      clipPath: "polygon(0 48%, 100% 48%, 100% 100%, 0 100%)",
      filter: "drop-shadow(0 0 7px rgba(255,205,165,0.75))",
    } as any) : {}),
  } as any,
  vnShock: { position: "absolute", left: "50%", top: "50%", marginLeft: -80, marginTop: -80, width: 160, height: 160, borderRadius: 999, borderWidth: 3, borderColor: "rgba(255,235,225,0.9)" } as any,
  vnPlaque: { position: "absolute", left: "50%", marginLeft: -190, width: 380, zIndex: 9 } as any,
  vnPlaqueLow: { top: "46%" } as any,
  vnPlaqueHigh: { top: "21%" } as any,
  vnPlaqueInner: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 22, paddingRight: 20, paddingVertical: 13,
    backgroundColor: "#000", borderWidth: 2, borderColor: "#fff", overflow: "hidden",
    transform: [{ rotate: "-2.5deg" }, { skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "8px 8px 0 rgba(230,0,18,0.92), 16px 16px 0 rgba(0,0,0,0.5)" } as any) : {}),
  } as any,
  vnPlaqueAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: theme.color.crimson } as any,
  vnGlyph: {
    width: 36, height: 36, borderRadius: 999, backgroundColor: "#050505", borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
    ...(web ? ({ boxShadow: "0 0 12px rgba(230,0,18,0.75)" } as any) : {}),
  } as any,
  vnGlyphSlit: { width: 22, height: 3, borderRadius: 2, backgroundColor: "#fff", ...(web ? ({ boxShadow: "0 0 7px rgba(255,255,255,0.9)" } as any) : {}) } as any,
  vnPlaqueTitle: { fontFamily: theme.font.display, fontSize: 34, lineHeight: 38, letterSpacing: 4, color: "#fff", textShadow: "3px 3px 0 rgba(230,0,18,0.95), 5px 5px 0 rgba(0,0,0,0.6)" } as any,



  /* ---------- ECHO — clash-void rings, compact stamp, chip lob to standby ---------- */
  esWrap: { ...StyleSheet.absoluteFillObject, zIndex: 8 } as any,
  esWave: {
    position: "absolute", left: "50%", marginLeft: -45, width: 90, height: 90, borderRadius: 999,
    borderWidth: 4, borderColor: "rgba(230,0,18,0.8)",
    ...(web ? ({ boxShadow: "0 0 24px rgba(230,0,18,0.5)" } as any) : {}),
  } as any,
  esStampWrap: { position: "absolute", left: "50%", top: "22%", marginLeft: -145, width: 290, alignItems: "center", zIndex: 3 } as any,
  esStamp: {
    backgroundColor: "#000", borderWidth: 2, borderColor: "#fff", overflow: "hidden",
    paddingVertical: 8, paddingHorizontal: 18,
    transform: [{ rotate: "-2deg" }, { skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "6px 6px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  esStampTxt: { fontFamily: theme.font.display, fontSize: 24, lineHeight: 28, letterSpacing: 3, color: "#fff", textShadow: "2px 2px 0 rgba(230,0,18,0.95)" } as any,
  esCrackFlash: {
    position: "absolute", left: "50%", top: "8%", bottom: "8%", width: 3, marginLeft: -1.5, backgroundColor: "#fff",
    ...(web ? ({ boxShadow: "0 0 10px rgba(255,255,255,0.95)" } as any) : {}),
  } as any,
  esChip: { position: "absolute", width: 72, height: 72, zIndex: 5, ...(web ? ({ offsetRotate: "0deg" } as any) : {}) } as any,
  /* lobs into the corner slot at the table's upper left (zone left 17%, top 7%).
     Chrome puts the element's CENTER on the path point, so each endpoint is the
     standby CENTER (272+36, 43.5+36) minus the chip's static anchor position
     (764+36, slotY+36): you Δ = (−456,−196), klein Δ = (−456,+15). */
  esChipPathTop: { offsetPath: 'path("M 0 0 C -80 -55, -400 -48, -456 15")' } as any,
  esChipPathBottom: { offsetPath: 'path("M 0 0 C -80 -260, -400 -240, -456 -196")' } as any,
  /* same lobs into the BESIDE slot (center 396, 79.5 — +88px right of the corner) */
  esChipPathTop2: { offsetPath: 'path("M 0 0 C -80 -50, -320 -45, -368 15")' } as any,
  esChipPathBottom2: { offsetPath: 'path("M 0 0 C -80 -255, -340 -240, -368 -196")' } as any,

  /* ---------- WARD — the parry barrier ---------- */
  wdActRing: {
    position: "absolute", width: 150, height: 190, borderRadius: 999,
    borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(230,0,18,0.85)",
    ...(web ? ({ boxShadow: "0 0 22px rgba(230,0,18,0.5)" } as any) : {}),
  } as any,




  wdEyeWrap: { position: "absolute", left: "50%", marginLeft: -95, zIndex: 8, alignItems: "center", ...(web ? ({ filter: "drop-shadow(0 0 26px rgba(252,238,33,0.35))" } as any) : {}) } as any,

  /* gold burst behind the eye the instant the lids snap apart */
  wdEyeFlare: {
    position: "absolute", width: 340, height: 220, borderRadius: 999, opacity: 0,
    ...(web ? ({ backgroundImage: "radial-gradient(ellipse at 50% 50%, rgba(252,238,33,0.55) 0%, rgba(242,193,78,0.2) 45%, rgba(0,0,0,0) 72%)" } as any) : {}),
  } as any,

  wdAsh: {
    width: 110, height: 16, borderRadius: 999,
    ...(web ? ({ backgroundImage: "radial-gradient(ellipse at 50% 50%, rgba(40,32,28,0.95) 0%, rgba(70,58,50,0.6) 55%, rgba(0,0,0,0) 100%)" } as any) : {}),
  } as any,

  /* REVERSAL — the totals themselves fly through the vortex and trade places.
     Slot centers are MEASURED from the resident chip numbers (the label column
     is not circle-centered). The end tangent is vertical: each number dives
     straight DOWN (or up) into the slot — no sweep across the chip face. */
  rvFlyPathYou: { offsetPath: 'path("M 0 0 C 460 -330, 1322 -120, 1322 -300")' } as any,
  rvFlyPathKlein: { offsetPath: 'path("M 0 0 C -460 330, -1322 120, -1322 300")' } as any,

  /* ---------- ORACLE — the star chart + the persistent peek markers ---------- */
  peekStar: {
    position: "absolute", width: 76, height: 76, borderRadius: 999, alignItems: "center", justifyContent: "center",
    backgroundColor: "#000", borderWidth: 3, borderColor: theme.color.yellow, zIndex: 26,
    ...(web ? ({ boxShadow: "0 0 18px rgba(252,238,33,0.4)" } as any) : {}),
  } as any,
  peekStarHover: { ...(web ? ({ boxShadow: "0 0 32px rgba(252,238,33,0.8)" } as any) : {}) } as any,
  peekStarKlein: { borderColor: theme.color.crimson, ...(web ? ({ boxShadow: "0 0 18px rgba(230,0,18,0.4)" } as any) : {}) } as any,
  peekStarKleinHover: { ...(web ? ({ boxShadow: "0 0 32px rgba(230,0,18,0.75)" } as any) : {}) } as any,
  peekStarCount: {
    position: "absolute", top: -8, right: -8, width: 26, height: 26, borderRadius: 999,
    backgroundColor: theme.color.yellow, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000",
  } as any,
  peekStarCountTxt: { fontFamily: theme.font.display, fontSize: 15, lineHeight: 17, color: "#111" } as any,
  peekStarTag: {
    position: "absolute", bottom: -18, backgroundColor: "#000", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.55)",
    paddingHorizontal: 8, paddingVertical: 1, transform: [{ skewX: "-8deg" }],
  } as any,
  peekStarTagTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: "#fff", fontWeight: "900" } as any,
  peekCardsRow: { flexDirection: "row", gap: 14, alignItems: "center", justifyContent: "center", marginVertical: 12 } as any,

  wdWave: {
    position: "absolute", borderRadius: 999,
    borderWidth: 4, borderColor: "rgba(230,0,18,0.8)",
  } as any,

  /* mult doubling beat — hanging number, impact FX, ×N stamp, chip flight */
  muFlyWrap: { ...StyleSheet.absoluteFillObject, zIndex: 12 } as any,
  muHangNumWrap: { position: "absolute", width: 120, height: 120, alignItems: "center", justifyContent: "center" } as any,
  muHangNum: { position: "absolute", fontFamily: theme.font.display, fontSize: 92, lineHeight: 96, textShadow: "6px 6px 0 rgba(0,0,0,0.85)" } as any,
  muHangNumFin: { position: "absolute", fontFamily: theme.font.display, fontSize: 128, lineHeight: 132, textShadow: "8px 8px 0 rgba(0,0,0,0.85), 0 0 44px rgba(252,238,33,0.55)" } as any,
  muImpBurst: { position: "absolute", width: 150, height: 150, marginLeft: -75, marginTop: -75, ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: theme.color.crimson } as any) : {}) } as any,
  muImpRing: { position: "absolute", width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: 999, borderWidth: 6, borderColor: "#fff" } as any,
  muStampX: { position: "absolute", backgroundColor: "#000", borderWidth: 3, paddingVertical: 4, paddingHorizontal: 12, transform: [{ rotate: "8deg" }], ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
  muStampXTxt: { fontFamily: theme.font.display, fontSize: 34, lineHeight: 38, textShadow: "2px 2px 0 #000" } as any,
  muChipFly: { position: "absolute", left: "17%", top: "7%", width: 72, height: 72 } as any,
  /* cubic beziers from the chip's corner parking spot to the hanging number.
     Control points pull AWAY from the straight line immediately, so it's
     curving from frame 1. Chip parks at zone left 17% (origin ≈ 272px);
     the number hangs at zone 38% (≈608px) → Δx ≈ +336 at stage width 1600. */
  muChipFlyPathYou: { offsetPath: 'path("M 0 0 C 80 -120, 240 -40, 336 188")', offsetRotate: "0deg" } as any,
  muChipFlyPathKlein: { offsetPath: 'path("M 0 0 C 80 -140, 260 -90, 336 3")', offsetRotate: "0deg" } as any,

  nullFlash: { position: "absolute", top: -30, left: "50%", marginLeft: -430, width: 860, height: 440, borderRadius: 999, ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.95) 0%, rgba(252,238,33,0.35) 38%, transparent 68%)" } as any) : {}) } as any,
  shieldWave: { position: "absolute", top: 60, left: "50%", marginLeft: -120, width: 240, height: 240, borderRadius: 999, borderWidth: 6, borderColor: theme.color.yellow, ...(web ? ({ boxShadow: "0 0 40px rgba(252,238,33,0.7), inset 0 0 40px rgba(252,238,33,0.5)" } as any) : {}) } as any,
  shieldRow: { flexDirection: "row", alignItems: "center", gap: 18 } as any,
  shieldPlate: { width: 112, alignItems: "center", backgroundColor: "#000", borderWidth: 3, borderRadius: 6, paddingVertical: 8, ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.8)" } as any) : {}) } as any,
  shieldPlateNum: { fontFamily: theme.font.display, fontSize: 54, lineHeight: 56, textShadow: "3px 3px 0 rgba(0,0,0,0.9)" } as any,
  shieldPlateLbl: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.paperDim, fontWeight: "900" } as any,
  shieldVs: { fontFamily: theme.font.display, fontSize: 44, lineHeight: 46, color: "#fff", textShadow: "4px 4px 0 rgba(230,0,18,0.9), 2px 2px 0 #000" } as any,
  shieldBanner: { fontFamily: theme.font.display, fontSize: 32, lineHeight: 36, color: theme.color.yellow, backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingHorizontal: 14, transform: [{ skewX: "-12deg" }], textShadow: "3px 3px 0 rgba(230,0,18,0.9)" } as any,
  shieldSub: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 4, color: "#fff", fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  nullStamp: { backgroundColor: "#000", borderWidth: 4, borderColor: theme.color.yellow, paddingVertical: 8, paddingHorizontal: 22, ...(web ? ({ boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
  nullStampTxt: { fontFamily: theme.font.display, fontSize: 42, lineHeight: 46, letterSpacing: 5, color: theme.color.yellow, textShadow: "3px 3px 0 rgba(230,0,18,0.9)" } as any,

  /* power countdown FX — plates live in the felt slots; loser card explodes, winner card pops */
  cardShard: { position: "absolute", left: -6, top: -12, width: 12, height: 24, backgroundColor: "#F5EFE1", borderWidth: 1, borderColor: "rgba(0,0,0,0.4)" } as any,

  /* shield-break cinematic */
  sbWrap: { position: "absolute", left: "50%", top: "9%", marginLeft: -240, width: 480, alignItems: "center", zIndex: 9 } as any,
  sbAura: { position: "absolute", left: "50%", top: "50%", marginLeft: -115, marginTop: -115, width: 230, height: 230, borderRadius: 999, ...(web ? ({ backgroundImage: "radial-gradient(rgba(230,0,18,0.55) 0%, rgba(230,0,18,0.18) 45%, transparent 70%)" } as any) : {}) } as any,
  sbShield: {
    width: 150, height: 170, alignItems: "center", justifyContent: "center",
    ...(web ? ({ clipPath: "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 0% 60%, 0% 11%)", backgroundColor: theme.color.crimson, boxShadow: "0 14px 40px rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  sbShieldInner: { position: "absolute", left: 8, right: 8, top: 8, bottom: 16, backgroundColor: "#16090a", ...(web ? ({ clipPath: "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 0% 60%, 0% 11%)" } as any) : {}) } as any,
  sbShieldMark: { fontFamily: theme.font.display, fontSize: 56, color: "#FF4D5E", textShadow: "0 0 24px rgba(230,0,18,0.9)" } as any,
  sbCrack: { position: "absolute", left: "50%", top: 82, marginLeft: -70, width: 140, height: 4, backgroundColor: "rgba(255,255,255,0.92)" } as any,
  sbShard: { position: "absolute", left: 234, top: 70, width: 13, height: 28, backgroundColor: theme.color.crimson } as any,

  /* ANIM LAB switcher — bottom-right, clear of the player's score chip */
  demoPanel: {
    position: "absolute", right: 14, bottom: 14, zIndex: 80, width: 380,
    backgroundColor: "rgba(0,0,0,0.92)", borderWidth: 3, borderColor: theme.color.yellow, padding: 10,
    transform: [{ skewX: "-4deg" }], ...(web ? ({ boxShadow: "6px 6px 0 rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  demoPanelTitle: { fontFamily: theme.font.display, fontSize: 16, letterSpacing: 3, color: theme.color.yellow, marginBottom: 8, textShadow: "2px 2px 0 rgba(230,0,18,0.9)" } as any,
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 } as any,
  demoBtn: { backgroundColor: "#111", borderWidth: 2, borderColor: theme.color.paperDim, paddingVertical: 5, paddingHorizontal: 8 } as any,
  demoBtnHover: { borderColor: theme.color.yellow, backgroundColor: theme.color.crimson } as any,
  demoBtnActive: { borderColor: theme.color.yellow, backgroundColor: "#20130a" } as any,
  demoBtnTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1, color: "#fff", fontWeight: "900" } as any,
  demoExit: { marginTop: 8, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#000", paddingVertical: 5, paddingHorizontal: 8, alignSelf: "flex-start" } as any,
  clashHud: {
    position: "absolute", left: "50%", top: "30%", marginLeft: -210, width: 420, zIndex: 8,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)", borderWidth: 3, borderColor: "#fff", paddingVertical: 10,
  } as any,
  clashShieldTxt: { fontFamily: theme.font.display, fontSize: 19, color: theme.color.yellow, letterSpacing: 1, textAlign: "center" } as any,
  trickOverlay: { position: "absolute", left: "50%", top: "26%", marginLeft: -230, width: 460, alignItems: "center", zIndex: 9 } as any,
  trickStamp: { width: "100%", alignItems: "center", backgroundColor: "#000", borderWidth: 4, borderColor: theme.color.yellow, paddingVertical: 12, paddingHorizontal: 16, ...(web ? ({ boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
  trickTitle: { fontFamily: theme.font.display, fontSize: 34, letterSpacing: 5, color: theme.color.yellow, textShadow: "3px 3px 0 #000" } as any,
  trickSub: { fontFamily: theme.font.body, fontSize: 15, color: "#fff", textAlign: "center", marginTop: 4, lineHeight: 21 } as any,
  swapRow: { flexDirection: "row", alignItems: "center", gap: 22, marginTop: 10 } as any,
  swapNum: { fontFamily: theme.font.display, fontSize: 40, backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingHorizontal: 18, paddingVertical: 2 } as any,
  swapArrow: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.yellow } as any,
  peekFloat: { width: 92, height: 122, borderRadius: 8, overflow: "hidden", marginHorizontal: 5, marginTop: 10, ...(web ? ({ boxShadow: "4px 5px 0 rgba(0,0,0,0.7)" } as any) : {}) } as any,

  statusTokenQTxt: { fontFamily: theme.font.display, fontSize: 11, color: "#000" } as any,

  /* clash-multiplier chip — mini burst seal (the verdict-star identity): black
     offset backing with a P5 crimson hard shadow, white mid-ring, face (yellow
     ×2 / crimson ×3) wobbling like the shield halves breathe, skewed tag, ? bubble */
  multChipArt: { width: 72, height: 72 } as any,
  multChipBurstB: {
    ...StyleSheet.absoluteFillObject, marginLeft: 7, marginTop: 9, backgroundColor: "#000",
    ...(web ? ({ clipPath: BURST_CLIP, boxShadow: "0 0 0 3px #000, 5px 6px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  multChipBurstW: {
    ...StyleSheet.absoluteFillObject, marginLeft: 4, marginTop: 5,
    ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: "#fff" } as any) : {}),
  } as any,
  multChipLive: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" } as any,
  multChipFace: { ...StyleSheet.absoluteFillObject, ...(web ? ({ clipPath: BURST_CLIP } as any) : {}) } as any,
  multChipTxt: { fontFamily: theme.font.display, fontSize: 38, lineHeight: 40, textShadow: "2px 2px 0 rgba(0,0,0,0.3)" } as any,

  /* shields-off chip — a split shield emblem: cracked halves breathing apart,
     danger aura, round counter in the crack, skewed tag beneath */
  shieldChip: {
    position: "absolute", zIndex: 26, alignItems: "center",
    ...(web ? ({ cursor: "pointer", animation: "dShieldPop 380ms cubic-bezier(.2,1,.3,1) both" } as any) : {}),
  } as any,
  shieldChipHover: { ...(web ? ({ transform: [{ scale: 1.12 }, { rotate: "-3deg" }] } as any) : {}) } as any,
  shieldChipArt: { width: 66, height: 74 } as any,
  shieldChipBack: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "#000",
    ...(web ? ({ clipPath: SHIELD_CLIP, animation: "dRedPulse 1.6s ease-in-out infinite", boxShadow: "0 6px 18px rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  shieldHalfL: {
    ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson,
    transform: [{ rotate: "-6deg" }],
    ...(web ? ({ clipPath: SHIELD_CLIP_L } as any) : {}),
  } as any,
  shieldHalfR: {
    ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson,
    transform: [{ rotate: "6deg" }],
    ...(web ? ({ clipPath: SHIELD_CLIP_R } as any) : {}),
  } as any,
  shieldMiniBack: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", ...(web ? ({ clipPath: SHIELD_CLIP } as any) : {}) } as any,
  shieldChipCount: {
    position: "absolute", left: -12, top: -6, width: 25, height: 25,
    backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow,
    alignItems: "center", justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
    ...(web ? ({ boxShadow: "3px 3px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  shieldChipCountTxt: { fontFamily: theme.font.display, fontSize: 15, lineHeight: 17, color: theme.color.yellow } as any,
  shieldChipTag: {
    backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 6,
    transform: [{ skewX: "-10deg" }, { rotate: "-3deg" }],
    ...(web ? ({ boxShadow: "3px 3px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  shieldChipTagTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.yellow, fontWeight: "900" } as any,
  shieldChipQ: {
    position: "absolute", top: -8, right: -10, width: 20, height: 20, borderRadius: 999,
    backgroundColor: theme.color.yellow, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  } as any,

  /* effect explainer modal — stamped notice */
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject, zIndex: 80, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center",
    ...(web ? ({ backdropFilter: "blur(4px)" } as any) : {}),
  } as any,
  infoPanel: {
    width: 600, backgroundColor: "#0b0b0b", borderWidth: 4, borderColor: theme.color.yellow,
    alignItems: "center", overflow: "hidden",
    ...(web ? ({ boxShadow: "12px 12px 0 rgba(230,0,18,0.9), 0 0 70px rgba(0,0,0,0.9)" } as any) : {}),
  } as any,
  infoTitleBar: {
    flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "stretch",
    backgroundColor: theme.color.crimson, borderBottomWidth: 4, borderBottomColor: "#000",
    paddingVertical: 12, paddingHorizontal: 20,
  } as any,
  infoTitleBadge: { width: 44, height: 44, backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] } as any,
  infoTitleBadgeTxt: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow } as any,
  infoTitle: { flex: 1, fontFamily: theme.font.display, fontSize: 28, color: theme.color.yellow, letterSpacing: 3, textShadow: "2px 2px 0 rgba(0,0,0,0.9)" } as any,
  infoInner: {
    alignSelf: "stretch", marginHorizontal: 20, marginTop: 20, borderWidth: 2, borderStyle: "dashed",
    borderColor: "rgba(230,0,18,0.55)", backgroundColor: "#160a0b", padding: 18,
  } as any,
  infoBody: { fontFamily: theme.font.body, fontSize: 16, lineHeight: 25, color: "#fff", textAlign: "left" } as any,
  infoClose: {
    backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 30, paddingVertical: 10,
    marginVertical: 20, transform: [{ skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.85)", cursor: "pointer" } as any) : {}),
  } as any,
  infoCloseHover: { ...(web ? ({ transform: [{ skewX: "-8deg" }, { scale: 1.08 }], boxShadow: "4px 4px 0 rgba(0,0,0,0.85), 0 0 22px rgba(252,238,33,0.65)" } as any) : {}) } as any,
  infoCloseTxt: { fontFamily: theme.font.display, fontSize: 17, color: "#fff", letterSpacing: 2 } as any,

  /* ---------- player zone — overlays the table's near edge, like held cards ---------- */
  playerZone: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", zIndex: 30, paddingBottom: 44 } as any,
  handCol: { alignItems: "center", gap: 8 } as any,
  moveBanner: {
    backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 32, paddingVertical: 8,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 5 },
    ...(web ? ({ boxShadow: "0 0 0 3px #000, 6px 6px 0 rgba(0,0,0,0.9)" } as any) : {}),
  } as any,
  moveTxt: { fontFamily: theme.font.display, fontSize: 26, letterSpacing: 6, color: "#fff", textShadow: "3px 3px 0 #000" } as any,
  errorWrap: { alignItems: "center", gap: 8 } as any,
  errorTxt: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 1, color: "#FF4D5E", fontWeight: "800" } as any,

  handRow: { flexDirection: "row", justifyContent: "center", marginTop: 6 } as any,
  cardBtn: {
    width: 114, height: 156, borderRadius: 10, marginLeft: -16,
    ...(web ? ({ boxShadow: "3px 5px 0 rgba(0,0,0,0.7)", transition: "transform 150ms cubic-bezier(.2,1,.3,1), opacity 150ms" } as any) : {}),
  } as any,
  cardHover: { zIndex: 50, borderColor: theme.color.yellow } as any,
  cardDim: { opacity: 0.35 } as any,

  peekNote: { position: "absolute", right: "3%", bottom: 150, maxWidth: "26%", fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1, color: "#fff", fontWeight: "800", textAlign: "right", textShadow: "1px 1px 0 #000" } as any,

  nextBtn: {
    position: "absolute", right: "4%", bottom: 60, zIndex: 40,
    backgroundColor: theme.color.crimson, borderWidth: 4, borderColor: "#fff", paddingHorizontal: 36, paddingVertical: 16,
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }],
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 6, height: 6 },
    ...(web ? ({ boxShadow: "0 0 0 4px #000, 8px 8px 0 rgba(0,0,0,0.9)", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.12) 5px 10px), linear-gradient(180deg, #E60012 0%, #b8000f 100%)" } as any) : {}),
  } as any,
  nextBtnTxt: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 3, color: theme.color.paper, textShadow: "3px 3px 0 #000" } as any,

  /* ---------- result overlay ---------- */
  resultWrap: { ...StyleSheet.absoluteFillObject, zIndex: 70, alignItems: "center", justifyContent: "center" } as any,
  resultPanelL: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0a0a0a", transform: [{ skewX: "-12deg" }], borderRightWidth: 10, borderRightColor: theme.color.crimson } as any,
  resultPanelR: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(230,0,18,0.12)", transform: [{ skewX: "10deg" }] } as any,
  resultContent: { alignItems: "center", gap: 12 } as any,
  resultTitle: {
    fontFamily: theme.font.display, fontSize: 128, letterSpacing: 8,
    textShadow: "10px 10px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
  } as any,
  resultScore: { fontFamily: theme.font.display, fontSize: 32, letterSpacing: 4, color: "#fff", textShadow: "4px 4px 0 #000" } as any,
  resultSaved: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.paperFaint, fontWeight: "800" } as any,
  resultBtns: { flexDirection: "row", gap: 16, marginTop: 14 } as any,

  bigBtn: {
    backgroundColor: theme.color.crimson, borderWidth: 4, borderColor: "#fff", paddingHorizontal: 34, paddingVertical: 14,
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }],
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 6, height: 6 },
    ...(web ? ({ boxShadow: "0 0 0 4px #000, 7px 7px 0 #000", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.12) 5px 10px), linear-gradient(180deg, #E60012 0%, #b8000f 100%)" } as any) : {}),
  } as any,
  bigBtnHovered: { transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }, { scale: 1.08 }], ...(web ? ({ filter: "brightness(1.12) saturate(1.2)" } as any) : {}) } as any,
  bigBtnPressed: { transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }, { scale: 0.94 }] } as any,
  bigBtnTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 3, color: theme.color.paper, textShadow: "3px 3px 0 #000" } as any,
  bigBtnGhost: { backgroundColor: "#0f0f0f", borderWidth: 4, borderColor: theme.color.paperFaint, paddingHorizontal: 34, paddingVertical: 14, transform: [{ skewX: "-10deg" }] } as any,
  bigBtnGhostHovered: { borderColor: theme.color.paperDim } as any,
  bigBtnGhostTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 3, color: theme.color.paperDim } as any,

  /* card face */
  face: { flex: 1, borderRadius: 9, borderWidth: 2.5, alignItems: "center", justifyContent: "center", gap: 3, overflow: "hidden" } as any,
  faceCornerA: { position: "absolute", top: -14, left: -14, width: 30, height: 30, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
  faceCornerB: { position: "absolute", bottom: -14, right: -14, width: 30, height: 30, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
  facePower: { fontFamily: theme.font.display, fontSize: 52, lineHeight: 54, textShadow: "2px 2px 0 rgba(0,0,0,0.25)" } as any,
  faceName: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1.5, fontWeight: "900" } as any,
  faceTag: { paddingHorizontal: 8, paddingVertical: 2, transform: [{ skewX: "-8deg" }], borderWidth: 1, borderColor: "rgba(0,0,0,0.5)" } as any,
  faceTagTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: "#fff", fontWeight: "900" } as any,
});

export const DUEL_KEYFRAMES = `
            @keyframes dFloat{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-10px) rotate(-1deg)}}
            @keyframes dHandIn{from{opacity:0;transform:translateY(90px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
            @keyframes dFlipIn{0%{transform:perspective(700px) rotateX(78deg) translateY(26px) scale(.86);opacity:0}60%{transform:perspective(700px) rotateX(-12deg) translateY(0) scale(1.04);opacity:1}100%{transform:perspective(700px) rotateX(0) translateY(0) scale(1)}}
            @keyframes dImpact{0%{transform:translate(0,0) rotate(0)}20%{transform:translate(-9px,5px) rotate(-1.2deg)}40%{transform:translate(8px,-6px) rotate(1deg)}60%{transform:translate(-6px,3px) rotate(-.6deg)}80%{transform:translate(4px,-2px) rotate(.4deg)}100%{transform:translate(0,0) rotate(0)}}
            @keyframes dStampIn{0%{opacity:0;transform:scale(2.6) rotate(-18deg)}55%{opacity:1;transform:scale(.92) rotate(-8deg)}75%{transform:scale(1.08) rotate(-9deg)}100%{opacity:1;transform:scale(1) rotate(-9deg)}}
            @keyframes dBubbleIn{0%{opacity:0;transform:translateX(30px) skewX(-6deg) scale(.7)}70%{transform:translateX(-4px) skewX(-6deg) scale(1.05)}100%{opacity:1;transform:translateX(0) skewX(-6deg) scale(1)}}
            @keyframes dDots{0%,100%{opacity:.25}50%{opacity:1}}
            @keyframes dStripe{from{background-position:0 0}to{background-position:84px 0}}
            @keyframes dIntroT{0%{opacity:0;transform:scale(2.4) skewX(-14deg)}35%{opacity:1;transform:scale(1) skewX(-14deg)}80%{opacity:1;transform:scale(1) skewX(-14deg)}100%{opacity:0;transform:scale(1.1) skewX(-14deg)}}
            @keyframes dIntroPanel{0%{transform:translateX(0) skewX(-14deg)}100%{transform:translateX(-130%) skewX(-14deg)}}
            @keyframes dPanelL{0%{opacity:0;transform:translateX(-60%) skewX(-12deg)}100%{opacity:1;transform:translateX(0) skewX(-12deg)}}
            @keyframes dPanelR{0%{opacity:0;transform:translateX(60%) skewX(-12deg)}100%{opacity:1;transform:translateX(0) skewX(-12deg)}}
            @keyframes dTitleSlam{0%{opacity:0;transform:scale(3) rotate(-10deg)}60%{opacity:1;transform:scale(.94) rotate(-6deg)}80%{transform:scale(1.05) rotate(-7deg)}100%{opacity:1;transform:scale(1) rotate(-7deg)}}
            @keyframes dNumSlam{0%{opacity:0;transform:scale(2.2)}100%{opacity:1;transform:scale(1)}}
            @keyframes dPulse{0%,100%{transform:skewX(-10deg) scale(1)}50%{transform:skewX(-10deg) scale(1.04)}}
            @keyframes dLunge{0%{transform:scale(1)}35%{transform:scale(1.05) translateY(-8px)}100%{transform:scale(1)}}
            @keyframes dDotBounce{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-14px);opacity:1}}
            @keyframes dSwapL{0%{transform:translateX(-90px);opacity:0}30%{opacity:1}100%{transform:translateX(90px);opacity:1}}
            @keyframes dSwapR{0%{transform:translateX(90px);opacity:0}30%{opacity:1}100%{transform:translateX(-90px);opacity:1}}
            @keyframes dShard{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(0,-90px) rotate(220deg)}}
            @keyframes dFlyYou{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.2)}78%{opacity:1;transform:translate(-540px,122px) scale(1.45)}100%{opacity:0;transform:translate(-558px,130px) scale(1.15)}}
            @keyframes dFlyKlein{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.2)}78%{opacity:1;transform:translate(547px,-44px) scale(1.45)}100%{opacity:0;transform:translate(563px,-46px) scale(1.15)}}
            @keyframes dFlipBack{0%{transform:perspective(700px) rotateY(0deg) scale(1);opacity:1}100%{transform:perspective(700px) rotateY(92deg) scale(.94);opacity:0}}
            @keyframes dFlipFace{0%{transform:perspective(700px) rotateY(-92deg) scale(.9)}70%{transform:perspective(700px) rotateY(9deg) scale(1.04)}100%{transform:perspective(700px) rotateY(0deg) scale(1)}}
            @keyframes dShieldPop{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
            @keyframes dNullFlash{0%{opacity:0}12%{opacity:.95}60%{opacity:.35}100%{opacity:0}}
            @keyframes dShieldWave{0%{transform:scale(.25);opacity:.95}100%{transform:scale(2.9);opacity:0}}
            @keyframes dNullSmash{0%{transform:scale(1)}25%{transform:scale(1.3)}55%{transform:scale(.9) rotate(2deg);opacity:1}100%{transform:scale(.8) rotate(4deg);opacity:.12}}
            @keyframes dTickPulse{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}
            @keyframes dLockIn{0%{transform:scale(1)}55%{transform:scale(1.55)}100%{transform:scale(1.38)}}
            @keyframes dLockOut{0%{transform:scale(1);opacity:1}100%{transform:scale(.6);opacity:.2}}
            @keyframes dCardWinY{0%{transform:scale(1);box-shadow:5px 7px 0 rgba(0,0,0,0.7)}60%{transform:scale(1.22);box-shadow:0 0 36px rgba(252,238,33,0.85), 5px 7px 0 rgba(0,0,0,0.7)}100%{transform:scale(1.15);box-shadow:0 0 30px rgba(252,238,33,0.7), 5px 7px 0 rgba(0,0,0,0.7)}}
            @keyframes dCardWinR{0%{transform:scale(1);box-shadow:5px 7px 0 rgba(0,0,0,0.7)}60%{transform:scale(1.22);box-shadow:0 0 36px rgba(255,77,94,0.85), 5px 7px 0 rgba(0,0,0,0.7)}100%{transform:scale(1.15);box-shadow:0 0 30px rgba(255,77,94,0.7), 5px 7px 0 rgba(0,0,0,0.7)}}
            @keyframes dCardLose{0%{opacity:1;transform:scale(1)}30%{transform:scale(1.05)}100%{opacity:.45;transform:scale(.94) rotate(2.5deg)}}
            @keyframes dShardOut{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(0,-120px) rotate(260deg)}}
            @keyframes dShieldSlam{0%{opacity:0;transform:scale(2.2) rotate(-16deg)}60%{opacity:1;transform:scale(.9) rotate(-6deg)}80%{transform:scale(1.08) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}
            @keyframes dSBAura{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.75;transform:scale(1.18)}}
            @keyframes dCrackIn{0%{opacity:0;transform:scale(1.7)}100%{opacity:1;transform:scale(1)}}
            @keyframes dShieldBreak{0%{opacity:1;transform:scale(1)}30%{transform:scale(1.15)}100%{opacity:0;transform:scale(.65)}}
            @keyframes dInfoPop{0%{opacity:0;transform:scale(.4) rotate(-9deg)}60%{opacity:1;transform:scale(1.08) rotate(1.8deg)}80%{transform:scale(.96) rotate(-2deg)}100%{opacity:1;transform:scale(1) rotate(-1.4deg)}}
            @keyframes dInfoFade{0%{opacity:0}100%{opacity:1}}
            @keyframes dRedPulse{0%,100%{box-shadow:0 0 0 rgba(230,0,18,0), 0 6px 18px rgba(0,0,0,0.8)}50%{box-shadow:0 0 26px rgba(230,0,18,0.85), 0 6px 18px rgba(0,0,0,0.8)}}
            @keyframes dHalfL{0%,100%{transform:rotate(-6deg) translateX(0)}50%{transform:rotate(-9deg) translateX(-3px)}}
            @keyframes dHalfR{0%,100%{transform:rotate(6deg) translateX(0)}50%{transform:rotate(9deg) translateX(3px)}}
            @keyframes dMultWobble{0%,100%{transform:rotate(-4deg) scale(1)}50%{transform:rotate(4deg) scale(1.07)}}
            @keyframes dTkPanelL{0%{opacity:0;transform:translate(-700px,-260px)}100%{opacity:1;transform:translate(0,0)}}
            @keyframes dTkPanelR{0%{opacity:0;transform:translate(700px,260px)}100%{opacity:1;transform:translate(0,0)}}
            @keyframes dTkPanelOutL{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-700px,-260px)}}
            @keyframes dTkPanelOutR{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(700px,260px)}}
            @keyframes dTkSlashIn{0%{transform:rotate(16deg) scaleY(0);opacity:0}40%{opacity:1}100%{transform:rotate(16deg) scaleY(1);opacity:1}}
            @keyframes dTkSlashOut{0%{transform:rotate(16deg) scaleY(1);opacity:1}100%{transform:rotate(16deg) scaleY(0);opacity:0}}
            @keyframes dTkFadeIn{0%{opacity:0;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
            @keyframes dTkFadeOut{0%{opacity:1}100%{opacity:0}}
            @keyframes dTkShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-16px,10px)}40%{transform:translate(14px,-12px)}60%{transform:translate(-10px,7px)}80%{transform:translate(8px,-5px)}}
            @keyframes dTkHalfA{0%{opacity:0}1%{opacity:1}100%{opacity:0;transform:translate(-150px,-70px) rotateX(-75deg) rotateZ(-16deg)}}
            @keyframes dTkHalfB{0%{opacity:0}1%{opacity:1}100%{opacity:0;transform:translate(130px,100px) rotateX(55deg) rotateZ(12deg)}}
            @keyframes dTkCutFlash{0%{opacity:0;transform:scaleX(.2)}25%{opacity:1;transform:scaleX(1.1)}100%{opacity:0;transform:scaleX(1.3)}}
            @keyframes dTkNumGone{to{opacity:0}}
            @keyframes dTkBladeHold{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(8px) rotate(-1.4deg)}}
            @keyframes dTkBladeDrop{to{transform:translateY(235px)}}
            @keyframes dTkBladeStrain{0%{transform:translateY(0)}22%{transform:translateY(18px) rotate(1deg)}42%{transform:translateY(5px)}62%{transform:translateY(14px) rotate(-1.2deg)}82%{transform:translateY(8px)}100%{transform:translateY(11px)}}
            @keyframes dTkRopeStrain{0%{transform:none}22%{transform:translateY(9px)}42%{transform:translateY(3px)}62%{transform:translateY(7px)}82%{transform:translateY(4px)}100%{transform:translateY(5px)}}
            @keyframes dMeterFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
            @keyframes dZonePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(2.2) saturate(1.6)}}
            @keyframes dTkRopeSlack{to{transform:translateY(28px) scaleY(.5) skewX(7deg)}}
            @keyframes dChipDrain{0%,100%{boxShadow:0 0 0 0 rgba(230,0,18,0)}50%{boxShadow:0 0 32px 7px rgba(230,0,18,0.85)}}
            @keyframes dChipTick{0%{transform:scale(1.5);opacity:.3}100%{transform:scale(1);opacity:1}}
            @keyframes dDrainPop{0%{transform:scale(2.4) translateY(0);opacity:0}12%{transform:scale(1) translateY(0);opacity:1}30%{transform:scale(1.08) translateY(-6px)}100%{transform:scale(1) translateY(-64px);opacity:0}}
            @keyframes dMuRing{0%{transform:scale(.5);opacity:.95}100%{transform:scale(1.3);opacity:0}}
            /* the chip slurves into the number along a TRUE CURVE — offset-path
               traces a quadratic bezier arc. Progress easing is smooth from 0
               (no slow crawl at the start); the chip stays FULLY VISIBLE through
               the whole curve and only fades in the final dive (78%+), landing
               exactly at the impact beat. */
            @keyframes dMultChipFlyYou{
              0%{offset-distance:0%;opacity:1}
              100%{offset-distance:100%;opacity:1}
            }
            @keyframes dMultChipFlyFadeYou{
              0%,75%{opacity:1}
              100%{opacity:0}
            }
            @keyframes dMultChipFlyKlein{
              0%{offset-distance:0%;opacity:1}
              100%{offset-distance:100%;opacity:1}
            }
            @keyframes dMultChipFlyFadeKlein{
              0%,75%{opacity:1}
              100%{opacity:0}
            }
            /* continuous spin + shrink through the whole flight */
            @keyframes dMultChipSpin{
              0%{transform:rotate(-4deg) scale(1)}
              100%{transform:rotate(430deg) scale(.55)}
            }
            /* doubling beats — base number sucked small and out, final slams big in */
            @keyframes dMultDouble{0%{transform:scale(1);opacity:1}40%{transform:scale(1.25);opacity:1}100%{transform:scale(.2) rotate(14deg);opacity:0}}
            @keyframes dMultFinIn{0%{transform:scale(2.6) rotate(-8deg);opacity:0}55%{transform:scale(.9) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
            @keyframes dMultImpact{0%{transform:scale(.3) rotate(-20deg);opacity:0}35%{transform:scale(1.15) rotate(6deg);opacity:1}100%{transform:scale(1.5) rotate(14deg);opacity:0}}
            @keyframes dLetterSlam{0%{opacity:0;transform:scale(3.4) rotate(-14deg)}55%{opacity:1;transform:scale(.88) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
            /* VOID — maw mutation on the felt */
            @keyframes dVdFadeIn{from{opacity:0}to{opacity:1}}
            @keyframes dVdFadeOut{from{opacity:1}to{opacity:0}}
            @keyframes dVdMutate{0%{transform:perspective(500px) rotateX(0deg) scale(1);opacity:1;filter:brightness(1)}45%{transform:perspective(500px) rotateX(-40deg) scale(.94);opacity:1;filter:brightness(1.7)}100%{transform:perspective(500px) rotateX(-86deg) scale(.68);opacity:0;filter:brightness(2.4)}}
            @keyframes dVdDevourDown{0%{transform:perspective(600px) translateY(0) rotate(0deg) scale(1);opacity:1}14%{transform:perspective(600px) translateY(24px) rotate(4deg) scale(1.05,1.12);opacity:1}60%{transform:perspective(600px) translateY(104px) rotate(150deg) scale(.6,.8);opacity:1}100%{transform:perspective(600px) translateY(178px) rotate(330deg) scale(.05);opacity:0}}
            @keyframes dVdDevourUp{0%{transform:perspective(600px) translateY(0) rotate(0deg) scale(1);opacity:1}14%{transform:perspective(600px) translateY(-24px) rotate(-4deg) scale(1.05,1.12);opacity:1}60%{transform:perspective(600px) translateY(-104px) rotate(-150deg) scale(.6,.8);opacity:1}100%{transform:perspective(600px) translateY(-178px) rotate(-330deg) scale(.05);opacity:0}}
            @keyframes dVdIris{0%{transform:scale(.18);opacity:0}55%{transform:scale(1.09);opacity:1}100%{transform:scale(1);opacity:1}}
            @keyframes dVdPortalOut{to{transform:scale(.02) rotate(120deg);opacity:0}}
            @keyframes dVdRingSpin{to{transform:rotate(360deg)}}
            @keyframes dVdRingSpinRev{to{transform:rotate(-360deg)}}
            @keyframes dVdInfall{0%{transform:translateY(0);opacity:0}12%{opacity:.95}85%{opacity:.65}100%{transform:translateY(128px);opacity:0}}
            @keyframes dVdCoreIn{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}
            @keyframes dVdFlare{0%,100%{filter:brightness(1)}30%{filter:brightness(2.3)}}
            @keyframes dVdShadeSweep{0%{transform:translate(-34px,-34px);opacity:0}16%{opacity:.95}56%{transform:translate(36px,36px);opacity:.95}70%{opacity:0}100%{transform:translate(36px,36px);opacity:0}}
            @keyframes dVdShock{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1.75);opacity:0}}
            @keyframes dVdPlaqueOut{to{opacity:0;transform:scale(.86) translateY(8px)}}
            /* ECHO — clash-void rings, chip pop + lob */
            @keyframes dEsWave{0%{transform:scale(.35);opacity:.95}100%{transform:scale(4.4);opacity:0}}
            @keyframes dEsChipPop{0%{transform:scale(0) rotate(-24deg)}60%{transform:scale(1.18) rotate(6deg)}100%{transform:scale(1) rotate(0deg)}}
            @keyframes dEsChipFly{from{offset-distance:0%}to{offset-distance:100%}}
            /* WARD — victim trick: flares while the eye charges, then the clip
               erosion tracks the canvas fire front 1:1 — the fire climbs the
               card from 2650ms to 4550ms = 42.7%→73.4% of this 6200ms clock
               (58% sits exactly on that line so the ramp stays linear). The
               card stays burned — a sticky hide keeps it off the table after
               the beat. */
            @keyframes dWdBurn{
              0%{transform:none;filter:brightness(1);clip-path:inset(0 0 0% 0)}
              8%{filter:brightness(1.7) saturate(1.5);clip-path:inset(0 0 0% 0)}
              16%{transform:none;filter:brightness(1.1);clip-path:inset(0 0 0% 0)}
              42.7%{transform:none;filter:grayscale(1) brightness(.6);clip-path:inset(0 0 0% 0)}
              58%{filter:grayscale(1) brightness(.42);clip-path:inset(0 0 50% 0)}
              73.4%{filter:grayscale(1) brightness(.3);clip-path:inset(0 0 100% 0)}
              88%{filter:grayscale(1) brightness(.3);clip-path:inset(0 0 100% 0);opacity:.6}
              100%{filter:grayscale(1) brightness(.3);clip-path:inset(0 0 100% 0);opacity:0}}
            @keyframes dWdActRing{0%{opacity:0;transform:scale(.8)}8%{opacity:1;transform:scale(1)}30%{transform:scale(1.04)}39%{opacity:0;transform:scale(1.5)}100%{opacity:0}}
            @keyframes dWdEyeOpen{0%{opacity:0;transform:scaleY(.04) scaleX(1.5)}55%{opacity:1;transform:scaleY(1.16) scaleX(.94)}75%{transform:scaleY(.96) scaleX(1.02)}100%{opacity:1;transform:scaleY(1) scaleX(1)}}
            @keyframes dWdEyeFlare{0%{opacity:0;transform:scale(.5)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}
            @keyframes dWdEyeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
            @keyframes dWdAshIn{from{opacity:0;transform:scaleY(.3)}to{opacity:.9;transform:scaleY(1)}}
            /* ORACLE — star-chart beat: faces burn through the constellation, the
               docked star pops, the peek star lands on its plate */
            @keyframes dOcFace{0%{opacity:0;transform:scale(1.3);filter:brightness(3) blur(7px)}55%{opacity:1;filter:brightness(1.7) blur(1px)}100%{opacity:1;transform:scale(1);filter:brightness(1)}}
            @keyframes dOcPop{0%{opacity:0;transform:scale(0)}60%{opacity:1;transform:scale(1.3)}100%{opacity:1;transform:scale(1)}}
            @keyframes dOcDock{0%{opacity:0;transform:scale(.2)}60%{opacity:1;transform:scale(1.25)}100%{opacity:1;transform:scale(1)}}
            @keyframes dEsCrackL{0%,100%{transform:translateX(0) rotate(0deg)}30%{transform:translateX(-5px) rotate(-3deg)}65%{transform:translateX(-3px) rotate(-2deg)}}
            @keyframes dEsCrackR{0%,100%{transform:translateX(0) rotate(0deg)}30%{transform:translateX(5px) rotate(3deg)}65%{transform:translateX(3px) rotate(2deg)}}
            @keyframes dEsCrackFlash{0%{opacity:0;transform:scaleY(.2)}35%{opacity:1;transform:scaleY(1)}100%{opacity:0;transform:scaleY(1.15)}}
            /* spent-chip deaths */
            @keyframes dChipDeath{0%{transform:scale(1);opacity:1}25%{transform:scale(1.14) rotate(-3deg)}55%{transform:scale(.9) rotate(6deg);opacity:.9}100%{transform:scale(.15) rotate(14deg);opacity:0}}
            @keyframes dShieldDeathL{0%{transform:none;opacity:1}100%{transform:translateX(-26px) rotate(-14deg);opacity:0}}
            @keyframes dShieldDeathR{0%{transform:none;opacity:1}100%{transform:translateX(26px) rotate(14deg);opacity:0}}
            /* spent-chip deaths */
            @keyframes dChipDeath{0%{transform:scale(1);opacity:1}25%{transform:scale(1.14) rotate(-3deg)}55%{transform:scale(.9) rotate(6deg);opacity:.9}100%{transform:scale(.15) rotate(14deg);opacity:0}}
            @keyframes dShieldDeathL{0%{transform:none;opacity:1}100%{transform:translateX(-26px) rotate(-14deg);opacity:0}}
            @keyframes dShieldDeathR{0%{transform:none;opacity:1}100%{transform:translateX(26px) rotate(14deg);opacity:0}}
          `;
