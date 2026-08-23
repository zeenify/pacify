/* BGM route map — single source of truth for which file in public/musics/ plays on which page.
   Filenames must match exactly the files in apps/web/assets/musics/ (also copied to public/musics/).
   Use null/undefined or "—" for "no BGM / keep previous". The controller will not restart if same track. */

import { playBgm } from "./sfx";

/**
 * Map expo-router pathname → track filename.
 * Replace "TBD" with an actual filename to enable. Use null for silence.
 * After editing, also update music-sets.md so the doc stays in sync.
 */
export const PAGE_BGM: Record<string, string | string[] | null> = {
  "/": null,
  "/login": null,
  "/load": null,
  "/start": "A Night Wanderer (From Femc Reloaded).mp3",
  "/menu": ["DeLorean.mp3", "Night Route.mp3", "Shirokuma.mp3"], // random pick
  "/campaign": "Jazz me tender.mp3",
  "/dossier": null,
  "/shame": "Sir.mp3",
  "/profile": "Ultimate Formation.mp3",
  "/howto": null,
  "/options": "Asian Dancer.mp3",
  "/multiplayer": null,
};

// Optional: per-page fade tuning. Defaults: fadeIn 900, fadeOut 700, loop true.
const PAGE_BGM_OPTS: Record<string, { fadeInMs?: number; fadeOutMs?: number; loop?: boolean }> = {
  // e.g. "/shame": { fadeInMs: 1200, loop: true },
};

export function getTrackForRoute(path: string | null | undefined): string | null {
  if (!path) return null;
  let p = path.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (!(p in PAGE_BGM)) return null;
  const v = PAGE_BGM[p];
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    // random pick — new roll each time the route is entered
    return v[Math.floor(Math.random() * v.length)];
  }
  return v;
}

/** Called by BgmController whenever pathname changes. Handles fade/crossfade. */
export async function playBgmForRoute(path: string | null | undefined) {
  const track = getTrackForRoute(path);
  let normalized: string | null = null;
  if (path) {
    let p = path.split("?")[0].split("#")[0];
    if (!p.startsWith("/")) p = `/${p}`;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    normalized = p;
  }
  const mapped = normalized !== null && normalized in PAGE_BGM;

  if (!mapped) return;
  if (track === null) {
    await playBgm(null);
    return;
  }
  const opts = normalized ? PAGE_BGM_OPTS[normalized] : undefined;
  await playBgm(track, { loop: true, ...opts });
}

// --- React controller — mount once in _layout --------------------------------
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

const webBgm = Platform.OS === "web";

function useWebPathname(): string {
  const [path, setPath] = useState(() =>
    webBgm && typeof window !== "undefined" ? window.location.pathname : "/"
  );
  useEffect(() => {
    if (!webBgm || typeof window === "undefined") return;
    const update = () => setPath(window.location.pathname);
    // patch pushState/replaceState to catch expo-router navigations
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    // @ts-ignore
    window.history.pushState = function (...args) {
      // @ts-ignore
      const ret = origPush.apply(this, args);
      window.dispatchEvent(new Event("pacify:location"));
      return ret;
    };
    // @ts-ignore
    window.history.replaceState = function (...args) {
      // @ts-ignore
      const ret = origReplace.apply(this, args);
      window.dispatchEvent(new Event("pacify:location"));
      return ret;
    };
    window.addEventListener("popstate", update);
    window.addEventListener("pacify:location", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", update);
      window.removeEventListener("pacify:location", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);
  return path;
}

export function BgmController() {
  const pathname = useWebPathname();
  useEffect(() => {
    if (!webBgm) return;
    playBgmForRoute(pathname);
  }, [pathname]);
  return null;
}
