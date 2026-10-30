import type { ReactNode } from "react";
import s from "./ScreenShell.module.css";

export function ScreenShell({ children, tint = "black" }: { children: ReactNode; tint?: "black" | "ink" }) {
  return (
    <div className={tint === "ink" ? `${s.root} ${s.rootInk}` : s.root}>
      <div className={s.slash} />
      <div className={s.slash2} />
      <div className={s.frame}>{children}</div>
    </div>
  );
}
