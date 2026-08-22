import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
import { theme, type Theme } from "./tokens";

const ThemeContext = createContext<Theme>(theme);

const P5_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Anton&family=Syne:wght@600;800&family=JetBrains+Mono:wght@700&display=swap');

/* P5 motion — snappy, overshoot, no bento fade */
@keyframes p5-entrance {
  0% { transform: translateY(14px) skewX(-12deg) scale(0.98); opacity: 0; }
  60% { transform: translateY(-2px) skewX(-12deg) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) skewX(-12deg) scale(1); opacity: 1; }
}
@keyframes p5-entrance-unskew {
  0% { transform: translateY(10px) scale(0.98); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes p5-blink {
  0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; }
}
@keyframes p5-float {
  0%,100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-6px) rotate(1deg); }
}
@keyframes p5-starburst {
  0% { transform: rotate(0deg) scale(1); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes p5-wipe {
  0% { transform: skewX(-12deg) translateX(-100%); }
  100% { transform: skewX(-12deg) translateX(0); }
}
@keyframes p5-underline {
  0% { transform: scaleX(0); } 100% { transform: scaleX(1); }
}

/* halftone dot pattern — crimson on black */
.p5-halftone {
  background-image: radial-gradient(circle, rgba(212,0,0,0.22) 1.8px, transparent 1.9px);
  background-size: 10px 10px;
}
/* diagonal stripes */
.p5-stripes {
  background: repeating-linear-gradient(-45deg, rgba(250,250,245,0.08) 0 2px, transparent 2px 12px);
}
/* grain */
.p5-grain { position: absolute; inset: 0; opacity: 0.08; pointer-events: none; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><filter id="n"><feTurbulence baseFrequency="0.9" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.35"/></svg>'); }

/* hard shadow helpers — no blur */
.p5-hard { box-shadow: 4px 4px 0 #000; }
.p5-hard-crimson { box-shadow: 6px 6px 0 #D40000; }
.p5-hard-white { box-shadow: 4px 4px 0 #FAFAF5; }

/* tilt utilities */
.p5-skew { transform: skewX(-12deg); }
.p5-unskew { transform: skewX(12deg); }
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
