/* Navigation bridge — mirrors expo-router's stable module-level `router`
   singleton. react-router's useNavigate() identity shifts with router state,
   which would re-trigger effects that were written against the stable
   expo-router `router` object (deps: []). Screens import { router } from here
   and keep their original empty dependency arrays. */
import { useNavigate, type NavigateFunction } from "react-router-dom";

let nav: NavigateFunction | null = null;

/** Mounted once inside the router (App) — keeps the bridge pointed at the
    live navigate function. Renders nothing. */
export function RouterBridge() {
  nav = useNavigate();
  return null;
}

export const router = {
  /** expo-router router.push equivalent */
  push(to: string) {
    nav?.(to);
  },
  /** expo-router router.replace equivalent */
  replace(to: string) {
    nav?.(to, { replace: true });
  },
};
