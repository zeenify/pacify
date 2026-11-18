/* BGM route map — single source of truth for which file in public/musics/ plays on which page.
   Filenames must match exactly the files in apps/web/assets/musics/ (also copied to public/musics/).
   Use null/undefined or "—" for "no BGM / keep previous". The controller will not restart if same track. */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { playBgm } from "./sfx";

/**
 * Map route pathname → track filename.
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
  // dialogue is silent (refusal, Klein encounter, epilogue) — unmapped routes
  // would keep the campaign track playing; null actually stops it
  "/story": null,
  "/tutorial": null, // Victor speaks without a music bed
  "/tutorial/duel": null,
  "/duel": null, // the fight is SFX-driven; BGM returns on /campaign
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

/** Called by BgmController whenever the route changes. Handles fade/crossfade.
 *  Tutorial states ride silent — Victor's pre-baked voice over music fights
 *  the mix — so any route carrying a ?tutorial= param is force-muted. */
export async function playBgmForRoute(path: string | null | undefined) {
  if (path && /[?&]tutorial=/.test(path)) {
    await playBgm(null);
    return;
  }
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

// --- React controller — mount once in App --------------------------------
// The Expo build patched history.pushState to observe expo-router navigations;
// with react-router the location comes straight from the router.

export function BgmController() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    playBgmForRoute(pathname + search);
  }, [pathname, search]);
  return null;
}
