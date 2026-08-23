# Music Sets — Pacify BGM Map

> One track per page (or shared). This file is the single source of truth for which
> file in `apps/web/assets/musics/` (copied to `public/musics/` for web) plays on which route.
> Update the **Track** column — the BGM engine in `apps/web/lib/bgm.ts` reads `PAGE_BGM` from this map.

Fill the `Track` column with the **exact filename** from `apps/web/assets/musics/` (e.g. `RISING.mp3`).
Use `—` or leave blank for “no music / keep previous”. Paths are resolved as `/musics/<encoded filename>` on web.

## Page → Track

| Route (expo-router) | Page | Track (filename in `assets/musics/`) | Loop | Notes |
|---|---|---|---|---|
| `/login` | Login / Enrollment | `—` | — | Silent — unlock gesture happens on submit. |
| `/load` | Loading | `—` | — | Silent — BGM preloads here without blocking. |
| `/start` | Title / Press Enter | `A Night Wanderer (From Femc Reloaded).mp3` | yes |  |
| `/menu` | Main Menu | `DeLorean.mp3` / `Night Route.mp3` / `Shirokuma.mp3` (random) | yes | One of the three picked at random on each entry. |
| `/campaign` | Campaign / 13 Tickets | `Jazz me tender.mp3` | yes |  |
| `/dossier` | Dossier | `TBD` | yes |  |
| `/shame` | Hall of Shame | `Sir.mp3` | yes |  |
| `/profile` | Profile / Report Card | `Ultimate Formation.mp3` | yes |  |
| `/howto` | How to Play | `TBD` | yes |  |
| `/options` | Options | `Asian Dancer.mp3` | yes |  |
| `/multiplayer` | Multiplayer (stub) | `TBD` | yes | |

> **How to assign:** Replace `TBD` with e.g. `Night Route.mp3`. Filenames with spaces/special chars are handled via `encodeURIComponent` — keep them exactly as in `assets/musics/`.

## Available Tracks (20)

Copy of `apps/web/assets/musics/` — also served from `public/musics/` on web:

- `A Night Wanderer (From Femc Reloaded).mp3`
- `Acceleration.mp3`
- `Altair.mp3`
- `Asian Dancer.mp3`
- `DeLorean.mp3`
- `Enoshima.mp3`
- `Hatsukoino Hito.mp3`
- `Jazz me tender.mp3`
- `Kizu.mp3`
- `Lightning Moment.mp3`
- `Night Route.mp3`
- `PRDR.mp3`
- `RISING.mp3`
- `Shirokuma (2024 Ver.).mp3`
- `Shirokuma.mp3`
- `Sir.mp3`
- `STAY TUNE.mp3`
- `The Fascinating Cats Eye.mp3`
- `THEME FROM LUPIN vs CAT'S EYE.mp3`
- `Ultimate Formation.mp3`

## Behaviour (implemented in `lib/sfx.ts` + `lib/bgm.ts`)

- **Autoplay unlock:** BGM `Audio` is created during `Load` and unlocked with the same user gesture as SFX (`unlockSfx` → `unlockBgm`). No extra click needed.
- **Start right away:** `BgmController` in `_layout.tsx` watches `usePathname()` and calls `playBgmForRoute(path)` on mount / route change.
- **Fade on switch:** `playBgm(track)` crossfades — fades out current over `~700ms`, then fades in new over `~900ms`. If same track, no restart.
- **Options BGM slider:** `bgmVol` + `mutedBgm` from `lib/options.ts` are live — `setVolumes()` updates BGM volume in real time via `applyBgmVolume()`.
- **Loading wait?** Recommended **no** — `Load` preloads BGM in parallel (`initBgm()`) with a 4s timeout, but doesn't gate `router.replace("/start")` on it. BGM will fade in as soon as ready (usually <500ms after `/start` mounts). This keeps loading snappy and avoids hanging on slow networks.
- **Loop:** All page BGMs loop by default.

## How to edit

1. Edit `PAGE_BGM` in `apps/web/lib/bgm.ts` (mirrors this table).
2. Update this file to match so the map stays in sync.

Last updated: 2026-01-04
