# Task 4 Report — CC0 source pipeline and provenance

**Status: DONE.** Commit `c672a99` — feat(sfx-studio): CC0 source pipeline with license guard and provenance.

All seven mandatory textures were **sourced from verified CC0 downloads — none are synthesized**.

## The binding contract — verified

All seven files exist at the exact required paths under `tools/sfx-studio/sources/normalised/`, are 44100 Hz mono 16-bit PCM, and read back cleanly through `readWav`:

```
card-flick.wav    0.72s   paper-slap.wav   0.60s   metal-clang.wav  1.74s
glass-shatter.wav 1.30s   wood-hit.wav     0.78s   rope-creak.wav   4.05s
fire-crackle.wav  8.00s
```

## Research: what I searched, where, what I found

### Kenney.nl (all packs CC0)
- Fetched `https://kenney.nl/assets/category:Audio` → 12 audio packs. Investigated **casino-audio**, **impact-sounds**, **rpg-audio**.
- Discovered Kenney's download flow: the page's `initiateDownload()` fetches `https://kenney.nl/download-link/<hex of assets/<slug>>` which returns JSON `{url: <signed zip url>}`. The endpoint returns `{"error":"forbidden"}` **without a `Referer: https://kenney.nl/assets/<slug>` header** — with it, it works. The pipeline implements this flow (never guessing URLs; signed link requested fresh each run).
- Downloaded all three zips, listed contents, and inspected candidates objectively: decoded to f32 mono via ffmpeg-static and measured duration/peak/RMS/crest-factor plus an ASCII envelope, since I cannot listen.

Selections (from measured envelopes):
- `card-flick` ← casino-audio `Audio/card-shove-1.ogg` (0.77s, crest 24.6, single dry flick, no room tail). card-place-* peaks >1.0 and is slappier/wetter; card-slide variants similar.
- `metal-clang` ← impact-sounds `Audio/impactBell_heavy_001.ogg` (1.74s, full ring-out decay from sample 0). impactMetal_* are dry 0.17s hits with no ring — rejected for this role.
- `wood-hit` ← impact-sounds `Audio/impactPlank_medium_000.ogg` (0.78s, immediate attack, solid body; not a hollow knock). rpg-audio `chop.ogg` (0.24s) considered but plank has more body.

### OpenGameArt (license filter tid=4 confirmed = CC0 on the search page itself)
Searched CC0+Sound-Effect for: fire crackling, glass shatter, paper slap, rope creak, glass, shatter, paper, rope, creak, breaking, card. Fetched every candidate content page and read the `field-art-licenses` line (plus the license icon link and `dcterms.creator`).

Selections:
- `paper-slap` ← "Various Paper Sound Effects" (`paper_sound_-_3.mp3`, crest 24, discrete sharp impacts — the -1/-2/-4 siblings are sustained rustles).
- `glass-shatter` ← "Glass Break" (`glass_breaking.wav`, 1.31s: burst + scattered debris tail visible in the envelope). Kenney's impactGlass_heavy files (0.17–0.43s) are too short and debris-free.
- `rope-creak` ← "Tree Creaking" (`tree_creak.flac`, 6.58s; active creak region 0.15–4.2s, trimmed to 4.05s). **No CC0 rope-specific recording exists** on OGA (rope search returned zero results) or Kenney; a tree trunk creaking under wind tension is the closest CC0 match to fibre-under-strain, which the task brief permits ("rope or fibre under tension creaking").
- `fire-crackle` ← "Fireplace Sound loop" (`fire.wav`, 29.26s, steady envelope crest 13.8 = dense crackle, no wind gusts, explicitly a loop). The other CC0 candidate "Fire crackling" (`fire-1.wav`) was rejected at **2.87s < 3s floor**. Trimmed to an 8s mid-file segment (2–10s).

### Not used
- freesound.org (browse-only, no OAuth key), pixabay.com (403) — per controller instructions.
- GitHub: not needed; Kenney + OGA covered all seven.
- Synthesis fallback: **not needed for any texture.**

## License verification per source (which page, what it said)

| id | page | what the page said | extra proof |
|---|---|---|---|
| card-flick | kenney.nl/assets/casino-audio | "License CC0" | zip `License.txt`: "License (Creative Commons Zero, CC0)" |
| metal-clang | kenney.nl/assets/impact-sounds | "License CC0" | zip `License.txt`: "License: (Creative Commons Zero, CC0)" |
| wood-hit | kenney.nl/assets/impact-sounds | "License CC0" | same License.txt |
| paper-slap | opengameart.org/content/various-paper-sound-effects | `field-art-licenses`: "License(s): CC0" | license icon links to creativecommons.org/publicdomain/zero/1.0/ |
| glass-shatter | opengameart.org/content/glass-break | "License(s): CC0" | search was pre-filtered to license tid 4 (CC0) |
| rope-creak | opengameart.org/content/tree-creaking | "License(s): CC0" | dcterms.creator AntumDeluge; body credits Department64 |
| fire-crackle | opengameart.org/content/fireplace-sound-loop | "License(s): CC0" | dcterms.creator PagDev |

All verification done by fetching the actual page HTML (not trusting search labels). All seven `provenance.json` notes record the verification.

## What I implemented

`tools/sfx-studio/sources.mjs` (~450 lines with comments):
- `SOURCES` — the seven entries above, each with `url`, `page`, `author`, `license`, `role`, a provenance `note`, and `normalise` (trim points, chosen empirically from measured envelopes).
- Two source kinds: `direct` (file URL) and `pack` (Kenney: signed-link request → zip download → **dependency-free zip extraction** via a minimal EOCD/central-directory reader + `node:zlib.inflateRawSync`). Pack zips are cached at `sources/raw/<pack>.zip`.
- `download()` with the brief's 1024-byte guard **plus magic-byte validation** per extension (RIFF/WAVE, OggS, fLaC, ID3/MPEG-sync, PK zip); on mismatch the error names the id and prints the first 16 bytes hex+ASCII (amendment 2).
- `normalise()` — `[atrim,] aformat=44100:mono [, volume] [, loudnorm=I=-18:TP=-2:LRA=11]` via `run()` from `../motion/encode.mjs`. `noLoudnorm` opt-out supported (amendment 1).
- Duration cross-check: every output's `readWav` seconds vs `probeDuration`; throws if they diverge >0.1s (loudnorm padding detector). `normalised.seconds` comes from reading the actual output via `readWav`; `probedSeconds` is also recorded.
- License guard: throws `REFUSING <id>: license is "<x>", only CC0 is permitted (spec §4.3)` and exits 1 on any non-CC0 entry.
- CLI `--list` / `--only <id>` / `--force`; cached runs skip when output exists and provenance URL matches. Exported `fetchSources({force, only, log})`; CLI only runs when the file is the entry point (importable without side effects, mirroring the Task 3 render.mjs fix).
- No new dependencies; no `Math.random`; ffmpeg only via `run()`/`probeDuration` wrappers.

**Loudnorm finding:** single-pass loudnorm worked correctly on all seven, including the 0.6–0.8s transients — measured output peaks 0.77–0.80 (≈ TP −2 dB as configured), durations unchanged, envelopes preserved. No entry needed the `volume=` opt-out.

## Verification outputs

1. `node tools/sfx-studio/sources.mjs --list` →
```
7 source(s) declared:
  card-flick       CC0  kenney:casino-audio    dry single-card flick/shove transient for card play, stamp and shuffle layers
  paper-slap       CC0  direct                 transient-heavy paper impact for page turns, dossier slams and UI paper layers
  metal-clang      CC0  kenney:impact-sounds   resonant metal strike with real ring-out for clash, shieldbreak and trick impacts
  glass-shatter    CC0  direct                 glass breaking with debris tail; pitched up + trimmed to fragments in shieldbreak/clash-loser recipes
  wood-hit         CC0  kenney:impact-sounds   solid wood-on-wood impact for table thuds, wood chop and card-land weight layers
  rope-creak       CC0  direct                 fibre-under-tension creak for Ward binds, rope tension and strain cues
  fire-crackle     CC0  direct                 sustained loopable fire crackle bed (>=3s) for Eclipse/fire trick layers
```

2. `node tools/sfx-studio/sources.mjs` →
```
    pack casino-audio: 0.8MB zip
  + card-flick  10KB -> 0.72s @ 44100Hz
  + paper-slap  15KB -> 0.60s @ 44100Hz
    pack impact-sounds: 0.8MB zip
  + metal-clang  15KB -> 1.74s @ 44100Hz
  + glass-shatter  226KB -> 1.30s @ 44100Hz
  + wood-hit  12KB -> 0.78s @ 44100Hz
  + rope-creak  226KB -> 4.05s @ 44100Hz
  + fire-crackle  10082KB -> 8.00s @ 44100Hz

provenance: C:\Users\EDRICK\Desktop\pacify\tools\sfx-studio\sources\provenance.json (7 entries)
```
Re-runs print `= <id> (cached)`; `--only wood-hit --force` re-fetched the Kenney zip and rebuilt the entry (proves the pack re-download path).

3. Step 3 loadability check →
```
  OK card-flick.wav 0.72s
  OK fire-crackle.wav 8.00s
  OK glass-shatter.wav 1.30s
  OK metal-clang.wav 1.74s
  OK paper-slap.wav 0.60s
  OK rope-creak.wav 4.05s
  OK wood-hit.wav 0.78s
ALL SOURCES LOADABLE
```

4. Mandatory-seven contract check (readWav per exact path) →
```
tools/sfx-studio/sources/normalised/card-flick.wav 0.72s 44100Hz mono16 OK
tools/sfx-studio/sources/normalised/paper-slap.wav 0.60s 44100Hz mono16 OK
tools/sfx-studio/sources/normalised/metal-clang.wav 1.74s 44100Hz mono16 OK
tools/sfx-studio/sources/normalised/glass-shatter.wav 1.30s 44100Hz mono16 OK
tools/sfx-studio/sources/normalised/wood-hit.wav 0.78s 44100Hz mono16 OK
tools/sfx-studio/sources/normalised/rope-creak.wav 4.05s 44100Hz mono16 OK
tools/sfx-studio/sources/normalised/fire-crackle.wav 8.00s 44100Hz mono16 OK
ALL SEVEN MANDATORY IDS PRESENT
```

5. License guard (temporary `guard-test` entry with `license: "CC-BY"`) →
```
Error: REFUSING guard-test: license is "CC-BY", only CC0 is permitted (spec §4.3)
exit code: 1
```
The temporary entry was removed; `grep -c guard-test` = 0 in both `sources.mjs` and `provenance.json`.

6. `npm test --prefix tools/sfx-studio` → **pass 37, fail 0** (no regression).

7. `git status --short` after commit → only the six pre-existing user entries (`.zcode/`, `tools/motion/pelican.*` ×4, `vibe_videos/`). `git check-ignore -v` confirms `sources/raw/` and `sources/normalised/` are ignored by `tools/sfx-studio/.gitignore`; `sources/provenance.json` is committed.

## Files changed
- **Created + committed:** `tools/sfx-studio/sources.mjs`, `tools/sfx-studio/sources/provenance.json`
- **Generated (gitignored, not committed):** `tools/sfx-studio/sources/raw/*` (3 Kenney zips + 7 raw audio files), `tools/sfx-studio/sources/normalised/*.wav` (7)
- `.gitignore` untouched (already correct from Task 1); `package.json` untouched (still zero deps).

## Downloaded vs synthesized — headline
**7/7 CC0-sourced, 0/7 synthesized.** Kenney: card-flick, metal-clang, wood-hit. OpenGameArt CC0: paper-slap, glass-shatter, rope-creak (tree creak — closest CC0 match to fibre strain), fire-crackle.

## Self-review findings
- Kept exactly 7 sources rather than the brief's suggested 8–14: the controller's binding constraint says the union across Tasks 9–14 is exactly these seven ids, so extra files would be dead weight nothing consumes. (Brief prose's "felt thud" is covered by card-flick per the controller.)
- Deviation from brief's code, deliberate: `main()` is guarded by an isMain check so `fetchSources`/`SOURCES` are importable without side effects (matches the Task 3 render.mjs precedent).
- Fixed a latent brief bug: `atrim` was only applied when `trimStart` was set; my version applies it for `trimEnd`-only too.
- `downloadedAt` reads 2026-11-04 (UTC) — correct at run time.
- Provenance `sha256` is of the extracted raw audio file (not the pack zip), so it stays stable across Kenney re-zips; `rawFile` field records the on-disk raw name.
- fire.wav raw is 10 MB (> brief's 2 MB preference) — accepted deliberately: it is the only CC0 fire crackle meeting the ≥3s floor, and raw/ is gitignored.

## Concerns
1. **Kenney signed URLs are session-scoped.** The committed `url` for pack entries is the pack *page* (stable); the actual zip URL is fetched fresh per run via `kenney.nl/download-link/<hex>` and requires the Referer header. If Kenney ever changes that endpoint, `resolveRaw` breaks with a clear HTTP error — re-point the flow, don't guess a URL.
2. **rope-creak is a tree creak, not rope.** Genuinely no CC0 rope recording was findable on the reachable sources. If a Task 12 (WARD) recipe author needs true rope fibre, the fallback is synthesising it from `dsp.mjs` noise+biquad at recipe level, or replacing this entry later (same filename contract).
3. **glass-shatter raw peaks above full scale (1.414 float).** The normalised output is true-peak-limited by loudnorm (TP=−2) and measures 0.767 peak — safe — but any future recipe that bypasses normalisation and uses the raw file must not assume ≤1.0.
4. Level consistency: transient entries land at peak ~0.79 but lower RMS than the sustained fire bed (0.157 RMS) — expected for TP-normalized percussive material; recipes set per-layer gain anyway.
