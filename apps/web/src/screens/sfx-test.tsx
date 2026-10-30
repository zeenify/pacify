import { useEffect } from "react";
import { initSfx, unlockSfx, playHover, playClick, playSliderTick, playCardPop } from "../lib/sfx";
import s from "./sfx-test.module.css";

export default function SfxTest() {
  useEffect(() => {
    initSfx();
  }, []);
  const wrapUnlockAnd = (fn: () => void) => () => {
    unlockSfx();
    fn();
  };
  return (
    <div className={`v ${s.stage}`}>
      <div className={`t ${s.title}`}>SFX TEST — tap to unlock then listen</div>
      <div className={`t ${s.hint}`}>If you hear nothing, check MAIN/SFX volume in Options and device volume. Files: public/sfx/</div>
      <div className={`v ${s.row}`}>
        <div className={`press ${s.btn}`} onClick={wrapUnlockAnd(playHover)}>
          <div className={`t ${s.btnTxt}`}>HOVER (old)</div>
        </div>
        <div className={`press ${s.btn}`} style={{ backgroundColor: "#E60012" }} onClick={wrapUnlockAnd(playClick)}>
          <div className={`t ${s.btnTxt}`}>CLICK — button confirm</div>
        </div>
        <div className={`press ${s.btn}`} style={{ backgroundColor: "#FCEE21" }} onClick={wrapUnlockAnd(playSliderTick)}>
          <div className={`t ${s.btnTxt}`} style={{ color: "#000" }}>SLIDER tick</div>
        </div>
        <div
          className={`press ${s.btn}`}
          style={{ backgroundColor: "#111111", borderColor: "#E60012", borderWidth: 2 }}
          onClick={wrapUnlockAnd(playCardPop)}
        >
          <div className={`t ${s.btnTxt}`}>CARD pop — ticket</div>
        </div>
      </div>
      <div className={`t ${s.note}`}>Direct files: /hover.wav, /sfx/click.wav, /sfx/slider.wav, /sfx/card.wav</div>
    </div>
  );
}
