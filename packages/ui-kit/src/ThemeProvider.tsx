import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
import { theme, type Theme } from "./tokens";

const ThemeContext = createContext<Theme>(theme);

// Exact polish from wix act assets: Anton/Oswald, bgShift, heroIn/jokerIn/rowIn/statIn
const P5_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&display=swap');

/* TEMP: selection enabled for design review — revert to none after pick */
* { -webkit-user-select: text; user-select: text; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
input, textarea { -webkit-user-select: text; user-select: text; }
html, body { overscroll-behavior: none; -webkit-text-size-adjust: 100%; touch-action: manipulation; }

@keyframes bgShift { from { background-position: 0 0 } to { background-position: 44px 44px } }
@keyframes heroIn { from { opacity:0; transform:translateX(-28px) skewX(-8deg) } to { opacity:1; transform:translateX(0) skewX(-8deg) } }
@keyframes jokerIn { from { opacity:0; transform:translateX(36px) scale(.98) } to { opacity:1; transform:translateX(0) scale(1) } }
@keyframes statIn { from { opacity:0; transform:skewX(-12deg) translateY(10px) scale(.96) } to { opacity:1; transform:skewX(-12deg) translateY(0) scale(1) } }
@keyframes rowIn { 0%{opacity:0;transform:translateX(-70px) skewX(-3deg)} 60%{opacity:1;transform:translateX(10px) skewX(-3deg)} 80%{transform:translateX(-4px) skewX(-3deg)} 100%{opacity:1;transform:translateX(0) skewX(-3deg)} }
@keyframes p5-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
@keyframes p5-entrance { from{opacity:0;transform:translateY(10px) skewX(-8deg)} to{opacity:1;transform:translateY(0) skewX(-8deg)} }
@keyframes p5-float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
@keyframes p5-load { 0%{width:0%} 70%{width:82%} 100%{width:100%} }
@keyframes p5-loadText { 0%,49%{opacity:1} 50%,100%{opacity:.25} }
@keyframes p5-blinkHard { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes p5-spin { from{ transform: rotate(0deg) } to{ transform: rotate(360deg) } }
@keyframes p5-scan { 0%{ transform: translateX(-120%) skewX(-20deg) } 100%{ transform: translateX(120%) skewX(-20deg) } }
@keyframes p5-slashA { from{ transform: translateX(-160%); opacity:0 } to{ transform: translateX(0); opacity:0.11 } }
@keyframes p5-slashB { from{ transform: translateX(160%); opacity:0 } to{ transform: translateX(0); opacity:0.09 } }
@keyframes p5-logoLetter { 0%{ opacity:0; transform: translateY(-48px) skewX(-22deg) scale(1.25) } 55%{ opacity:1; transform: translateY(8px) skewX(-14deg) scale(0.97) } 100%{ opacity:1; transform: translateY(0) scale(1) } }

/* bgShift helper */
.p5-stage {
  background: repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px);
  background-size: 44px 44px;
  animation: bgShift 1.8s linear infinite;
}
`;

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "p5-theme";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = P5_CSS;
    document.head.appendChild(el);
  }, []);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
export { theme };
export type { Theme };
