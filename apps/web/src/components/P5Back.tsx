/* P5Back v2 — built the way Atlus builds buttons: TWO stacked clip-path
   polygons (jagged black underlayer offset behind a crimson trapezoid),
   a white circle badge whose arrow spins on hover, and a yellow slash
   revealed between the separating layers. Text never skews — only the
   background layers do, so the label stays crisp. */
import { useState, type CSSProperties } from "react";
import { router } from "../lib/nav";
import { playHover, playClick } from "../lib/sfx";
import s from "./P5Back.module.css";

export function P5Back({
  label = "MENU",
  to = "/menu",
  onPress,
  style,
}: {
  label?: string;
  to?: string;
  onPress?: () => void;
  style?: CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      className={s.hit}
      style={style}
      onMouseEnter={() => {
        setHovered(true);
        playHover();
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        playClick();
        (onPress ?? (() => router.replace(to)))();
      }}
    >
      <div className={s.stage}>
        {/* yellow slash — hidden between the layers until hover separates them */}
        <div className={s.slash} />

        {/* layer 1 — jagged black underlayer (the Atlus sticker outline) */}
        <div className={s.jag} />

        {/* layer 2 — crimson trapezoid face */}
        <div className={s.face}>
          <div className={s.row}>
            <div className={s.badgeSpin}>
              <div className={s.badgeTxt}>{hovered ? "◀" : "◁"}</div>
            </div>
            <div className={s.txt}>{label}</div>
          </div>
        </div>
      </div>
    </button>
  );
}
