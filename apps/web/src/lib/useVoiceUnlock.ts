import { useEffect, useState } from "react";
import { audioUnlocked, unlockSfx } from "./sfx";

/**
 * Story/duel screens can be reached via session restore or a deep link with no
 * prior gesture — in that case WebAudio stays locked and `playVoice` silently
 * cancels before any network request. Unlock on the FIRST real gesture anywhere
 * on the screen and expose a one-shot tick so the current line can be retried
 * after it was gated (the line guard is set before playVoice is called).
 */
export function useVoiceUnlock(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked()) return;
      unlockSfx();
      setTick((t) => t + 1);
    };
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);
  return tick;
}
