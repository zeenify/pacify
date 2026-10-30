/* TITLE SCREEN — sits AFTER Load in the flow: Login -> Load -> Start -> Menu.
   Sound is already buffered+unlocked by the time we get here (login click was
   the gesture), so hover beeps work immediately. ENTER press re-asserts unlock. */
import { IonPage } from "@ionic/react";
import { useEffect, useState } from "react";
import { playHover, unlockSfx } from "../lib/sfx";
import { router } from "../lib/nav";
import s from "./start.module.css";

const GHOST_LETTERS = [
  { c: "P", rot: -14, y: -16, sz: 200 },
  { c: "A", rot: 9, y: 20, sz: 176 },
  { c: "C", rot: -7, y: -24, sz: 210 },
  { c: "I", rot: 12, y: 12, sz: 168 },
  { c: "F", rot: -11, y: 22, sz: 188 },
  { c: "Y", rot: 5, y: -14, sz: 196 },
];

const FAN_CARDS = [
  { label: "Void", rot: -18, y: 22, w: 96, anim: "p5-float 3.2s ease-in-out infinite" },
  { label: "Echo", rot: 14, y: -30, w: 82, anim: "p5-float 3.7s ease-in-out 0.3s infinite" },
  { label: "Ward", rot: -9, y: 30, w: 100, anim: "p5-float 3s ease-in-out 0.7s infinite" },
];

export default function Start() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [ctaHover, setCtaHover] = useState(false);

  useEffect(() => {
    // backup gesture capture — any click/keypress here unlocks audio too
    const unlock = () => {
      unlockSfx();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        <div className={`v ${s.slashSkew}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.slashAnim}`} style={{ animation: "p5-slashA 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>
        <div className={`v ${s.slash2Skew}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.slash2Anim}`} style={{ animation: "p5-slashB 0.9s 0.3s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>

        {/* ghost PACIFY — scattered letters, drifts with mouse */}
        <div
          className={`v ${s.ghost}`}
          style={{
            transform: `skewX(-8deg) translateX(${mouse.x * 12}px) translateY(${mouse.y * 7}px)`,
            transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: "none",
          }}
        >
          {GHOST_LETTERS.map((g, i) => (
            <div
              key={i}
              className={`t ${s.ghostLetter}`}
              style={{ fontSize: g.sz, transform: `rotate(${g.rot}deg) translateY(${g.y}px)` }}
            >
              {g.c}
            </div>
          ))}
        </div>

        {/* floating fan — scattered cards, each floats independently */}
        <div
          className={`v ${s.fan}`}
          style={{
            transform: `translateX(${mouse.x * -9}px) translateY(${mouse.y * -7}px)`,
            transition: "transform 600ms",
            pointerEvents: "none",
          }}
        >
          {FAN_CARDS.map((card, i) => (
            <div key={i} className={`v ${s.cardScatter}`} style={{ transform: `rotate(${card.rot}deg) translateY(${card.y}px)` }}>
              <div className={`v ${s.card}`} style={{ width: card.w, animation: card.anim }}>
                <div className={`t ${s.cardNum}`}>{card.label}</div>
                <div className={`v ${s.cardHalftone}`} />
              </div>
            </div>
          ))}
        </div>

        <div className={`v ${s.center}`}>
          <div className={`t ${s.logo}`}>
            {"PACIFY".split("").map((ch, i) => (
              <span
                key={i}
                className={`ti ${s.logoLetter}`}
                style={{ animation: `p5-logoLetter 600ms ${i * 70 + 120}ms cubic-bezier(0.16,1,0.3,1) both` }}
              >
                {ch}
              </span>
            ))}
          </div>

          <div className={`v ${s.underlineWrap}`} style={{ animation: "heroIn 520ms 300ms both" }}>
            <div className={`v ${s.underline}`} style={{ animation: "p5-entrance 600ms 400ms both" }} />
            <div className={`v ${s.underlineThin}`} />
          </div>

          <div className={`t ${s.tagline}`} style={{ animation: "heroIn 600ms 400ms both" }}>DONT OVERTHINK IT</div>

          <div
            className={`press ${s.cta}`}
            onMouseEnter={() => {
              setCtaHover(true);
              playHover();
            }}
            onMouseLeave={() => setCtaHover(false)}
            onClick={() => {
              unlockSfx();
              router.replace("/menu");
            }}
            style={{ animation: "heroIn 520ms 560ms both" }}
          >
            <div className={`t ${s.ctaText}`} style={ctaHover ? { color: "#E60012" } : undefined}>ENTER</div>
            <div
              className={`t ${s.ctaArrow}`}
              style={ctaHover ? { color: "#E60012", opacity: 1 } : undefined}
            >
              {ctaHover ? "▶ GO" : "◇"}
            </div>
            <div className={`v ${s.ctaYellow}`} style={ctaHover ? { height: 9, backgroundColor: "#E60012" } : undefined} />
          </div>
        </div>
      </div>
    </IonPage>
  );
}
