# Persona 5 UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the start screen, in-duel pause dialog, and table-log dialog so all three feel deliberately Persona 5-inspired, remain readable, and provide large touch targets on Android, mobile, and desktop.

**Architecture:** Keep the existing Ionic React routes and duel state intact. Redesign the start screen in its existing screen/CSS module; rebuild the two duel overlays as real-pixel dialogs outside the scaled 1600×900 game stage, using semantic buttons and a native range input while preserving the current audio, navigation, and log data APIs.

**Tech Stack:** React 19, Ionic React 9, TypeScript, CSS Modules, Vite, Vitest, existing PNG emblem/character assets, real-browser DevTools verification.

**Spec:** `docs/superpowers/plans/2026-11-18-p5-ui-redesign.md#design-brief` (self-contained design brief)

## Global Constraints

- UI only: do not change engine rules, AI behavior, duel resolution, scoring, round timing, server requests, navigation destinations, or persisted option meanings.
- Modify only `apps/web/src/screens/start.tsx`, `apps/web/src/screens/start.module.css`, `apps/web/src/screens/duel.tsx`, and `apps/web/src/screens/duel.module.css` unless a typecheck proves an directly related import requires adjustment.
- Use existing assets only. No image generation, new art downloads, new component library, or new test dependency.
- Remove the current start-screen grayscale portrait, its rectangular outline/slab, ghost-letter layer, scattered five-card fan, and scrolling bottom ticker. Do not add another outline, glow, frame, or sticker around the replacement character.
- Preserve `router.replace("/menu")` on the start CTA, audio unlock/hover sounds, all four audio buses, fullscreen, forfeit confirmation, BGM ducking, and the existing `PlayLogRow` values.
- Never expose a played card before its row enters `playLog`; current and future rounds remain unavailable in the log.
- Every interactive target is at least 48×48 CSS px. Primary actions are at least 56px tall; modal close, mute, and fullscreen controls should be 52–56px.
- Body and control labels are at least 16px on narrow screens. Do not rely on icons alone, hover, tiny letter-spaced text, or color alone to communicate an action or state.
- Dialogs use real viewport CSS pixels, `100dvh` where appropriate, safe-area padding, internal scrolling, visible keyboard focus, Escape/backdrop close, and focus containment/restoration.
- Decorative motion lasts 160–340ms on entry and does not loop continuously. Respect the existing `.p5-reduce` behavior.
- Do not redesign the main menu, table-log pile, duel table, or unrelated screens. Do not commit unless the user explicitly requests commits during execution.

---

## Design Brief

### Approaches considered

1. **Recommended — Phantom case file.** The start screen becomes an asymmetric editorial composition: huge title on the left, clean full-body Klein and two/three real cards on the right. Pause becomes a bold “SYSTEM INTERRUPT” panel with labelled settings and text actions. The log becomes a case file with seven round records and a large selected-clash reader. This gives each surface a distinct job while sharing ink/paper/red/yellow, hard shadows, clipped corners, and angled stamps.
2. **All-out red.** Fill most of each surface with red slabs, huge white type, and aggressive motion. It is initially loud and recognizably P5-like, but three loud overlays become tiring and red text/controls lose hierarchy. Use red as an accent in the recommended approach instead.
3. **Conservative responsive polish.** Keep the current start composition, seven-column log, and icon pause actions; only enlarge and add breakpoints. This is faster, but preserves the exact layout problems and will not reach the requested visual caliber.

### Shared visual grammar

- Palette: ink `#0A0A0A`, paper `#F5EFE1`, red `#E60012`, yellow `#FCEE21`, white `#FFFFFF`; green remains only on good-alignment card faces.
- Typography: Anton for large condensed headings and numbers; Oswald for labels and body copy. Avoid long all-caps paragraphs and tracking above 4px on small screens.
- Geometry: one or two decisive diagonal cuts per surface, 3–5px hard offset shadows, small rotated stamps, sparse halftone. Do not stack outlines, glows, bevels, glass panels, and multiple competing watermarks.
- Layering: content first, art second, texture last. Text and controls always sit on a solid or near-solid plate, never directly over busy character art.

### Start screen — “Take your seat”

- Desktop: left-aligned title block occupies roughly the first 55% of the width. A small `VERTEX INSTITUTE // FIRST YEAR DIVISION` kicker sits above `PACIFY`; `DON'T OVERTHINK IT.` sits below on a short paper/red slash. The primary CTA reads `ENTER THE TABLE ▶` and is at least 280×64px.
- Replace the portrait with `/students/2clubs9x16nobgcropped.png`: the clean full-body reaching pose, cropped by the viewport at the lower right. It gets no border, outline, glow, grayscale treatment, name badge, or surrounding rectangle. A single red diagonal field behind it supplies separation.
- Use at most three decorative cards: one crest back using `/emblems/back-crest.png`, Seraph, and Leviathan. Arrange them as a tight fan near Klein’s outstretched hand, with real emblem art and varied rotation. They support the pose rather than forming a second focal point.
- Remove mouse-tracking parallax and perpetual floating. Use one short staggered entrance for title, art, and CTA; afterward the screen is still.
- Narrow portrait: title/CTA remain full-width and dominant at the upper-left/center; Klein becomes a cropped lower-right background figure behind a solid title plate. Hide the decorative card fan below 700px. At 360px or short landscape sizes where the figure competes with the CTA, hide the figure too rather than shrinking the UI around it.
- Keep a thin static hazard strip at the bottom only if it does not collide with safe-area padding; no marquee.

### Pause dialog — “System interrupt”

- Full-screen dark scrim with a compact red diagonal slash, then a paper/ink panel labelled `PAUSED` and `DUEL // SYSTEM`. The panel is 720–780px wide on desktop and a full-viewport sheet on narrow phones.
- Replace icon-only bus controls with labelled rows: `MASTER`, `MUSIC`, `SFX`, `VOICE`. Each row contains a 52–56px mute button with visible `ON/OFF` state, a native range input with a 44px-tall interaction area and 26–28px thumb, and a readable percentage/`MUTED` value.
- Fullscreen is a full-width 56px row with icon, `FULLSCREEN`, and `ON/OFF`; it is not an unlabeled square.
- Actions are full-width text buttons: `▶ CONTINUE DUEL` (primary, 64px, yellow/paper) and `FORFEIT DUEL` (secondary, 56px, red outline). The top-right close button is 52–56px and has an accessible name.
- Forfeit confirmation uses the same visual shell and explicit buttons: `STAY IN DUEL` and `YES, FORFEIT`. Include the consequence copy `This duel will end and you will return to campaign.` Do not use bare X/check icons.
- Short landscape uses two columns—audio/settings left, actions right—only when width permits; otherwise the sheet scrolls. Never shrink controls to make everything fit.

### Table log dialog — “Clash case file”

- Move the overlay out of the transformed `.stage`; the pile remains where it is. The dialog renders as a real-pixel sibling of the stage and pause controls.
- Desktop shell: `TABLE LOG` stamp, `CLASH ARCHIVE` title, `YOU VS {oppName}`, and a 56px close button. Body splits into a 190–220px round rail and a flexible selected-round detail pane.
- Round rail contains R1–R7 buttons at least 56–60px tall. Completed rounds show outcome (`WON`, `LOST`, `TIED`) and running score; the selected record gets a yellow edge/stamp. Current reads `IN PLAY`, future rounds read `LOCKED`, and both are disabled.
- Default selection is the latest completed round. The selected detail shows `ROUND n // CLASH RECORD`, the two real `CardFace`s at 144–176px wide on desktop, explicit `YOU` and `{oppName}` labels, individual `+points`, a large winner/tie stamp, optional trick note, and running score. This sacrifices all-seven-at-once visibility for readable cards and one-tap round comparison.
- Narrow portrait: the round rail becomes a horizontal, scrollable seven-tab strip with 64px-wide minimum tabs; cards remain side-by-side at `clamp(112px, 34vw, 176px)` and the detail scrolls vertically. No seven-column squeeze and no horizontal page overflow.
- Empty log: a bold `NO CLASHES RECORDED` state with `Finish a round and its cards will be filed here.` Do not render seven large empty card placeholders.
- Keep the existing exit beat if it can coexist with the new layout; entry is a short scrim fade plus panel cut-in, not seven separately pulsing columns.

## File Map

- `apps/web/src/screens/start.tsx` — simplify title-screen markup, use the clean full-body asset and reduced card fan, keep route/audio behavior.
- `apps/web/src/screens/start.module.css` — new asymmetric composition, typography, CTA, responsive art visibility, safe areas, and entry motion.
- `apps/web/src/screens/duel.tsx` — semantic pause controls, labelled native slider, explicit forfeit confirmation, real-pixel table-log placement, selected-round log UI, dialog focus behavior.
- `apps/web/src/screens/duel.module.css` — responsive pause/log shells, large controls, round rail/tabs, clash detail, focus states, and reduced-motion-safe animation.

---

### Task 1: Rebuild the start screen

**Files:**
- Modify: `apps/web/src/screens/start.tsx:13-230`
- Modify: `apps/web/src/screens/start.module.css:1-342`

**Interfaces:**
- Consumes: `P5Image`, `playHover()`, `unlockSfx()`, `router.replace()`, existing `/students` and `/emblems` assets.
- Produces: unchanged default `Start` component and unchanged `/start` → `/menu` navigation contract.

- [ ] **Step 1: Capture the failing visual baseline**

Run:

```bash
npm run dev --workspace=@pacify/web
```

Open `http://localhost:8081/start` at 360×800, 844×390, and 1440×900. Capture screenshots and inspect horizontal overflow, title/CTA collisions, and art competition. Expected failing acceptance result: the fixed 138px title and desktop-positioned art do not form a deliberate narrow-portrait composition; the portrait slab/outline and multiple decorative layers remain visible.

- [ ] **Step 2: Replace the markup with the asymmetric composition**

Delete `GHOST_LETTERS`, mouse state/mousemove handling, CTA hover state, the old Klein portrait/slab/tag, ticker, and two-card trick entries. Keep a local `StartCard` only for the crest/Seraph/Leviathan fan. Use this structure and copy, adapting the existing card renderer rather than importing duel code:

```tsx
<div className={`v ${s.stage}`}>
  <div className={s.redCut} aria-hidden="true" />
  <div className={s.halftone} aria-hidden="true" />

  <main className={`v ${s.hero}`}>
    <div className={`t ${s.kicker}`}>VERTEX INSTITUTE // FIRST YEAR DIVISION</div>
    <h1 className={`t ${s.logo}`}>PACIFY</h1>
    <div className={`t ${s.tagline}`}>DON&apos;T OVERTHINK IT.</div>
    <button
      type="button"
      className={`press ${s.cta}`}
      onMouseEnter={playHover}
      onClick={() => { unlockSfx(); router.replace("/menu"); }}
    >
      <span className={`ti ${s.ctaText}`}>ENTER THE TABLE</span>
      <span className={`ti ${s.ctaArrow}`} aria-hidden="true">▶</span>
    </button>
  </main>

  <div className={`v ${s.art}`} aria-hidden="true">
    <div className={`v ${s.fan}`}>{/* crest, Seraph, Leviathan only */}</div>
    <P5Image
      src="/students/2clubs9x16nobgcropped.png"
      resizeMode="contain"
      className={s.kleinImg}
    />
  </div>
</div>
```

Decorative wrappers are `aria-hidden`; the CTA is a native button and no extra keydown handler is added.

- [ ] **Step 3: Build the responsive visual system**

Replace the old CSS rather than layering overrides on it. Use these concrete targets:

```css
.stage {
  flex: 1;
  min-height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
           max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
}
.hero { z-index: 3; width: min(58vw, 820px); align-self: center; margin-left: clamp(0px, 5vw, 80px); }
.logo { font: clamp(88px, 11vw, 176px)/0.86 "Anton", sans-serif; color: #fff;
        letter-spacing: 0; transform: skewX(-7deg); text-shadow: 8px 8px 0 #e60012; }
.kicker { font: 700 clamp(13px, 1.2vw, 18px)/1.4 "Oswald", sans-serif; color: #fcee21; }
.tagline { font: 700 clamp(17px, 1.5vw, 23px)/1.3 "Oswald", sans-serif; color: #111;
           background: #f5efe1; padding: 8px 16px; transform: rotate(-1deg) skewX(-7deg); }
.cta { min-width: 280px; min-height: 64px; padding: 14px 28px; flex-direction: row;
       align-items: center; justify-content: space-between; background: #e60012; color: #fff;
       border: 3px solid #fff; box-shadow: 6px 6px 0 #000; transform: skewX(-7deg); }
.ctaText { font: 26px/1 "Anton", sans-serif; letter-spacing: 2px; }
.art { position: absolute; right: 0; bottom: 0; height: min(94dvh, 920px); z-index: 1; pointer-events: none; }
.kleinImg { height: 100%; width: auto; filter: contrast(1.04) drop-shadow(10px 12px 0 rgba(0,0,0,.35)); }
.cta:focus-visible { outline: 4px solid #fcee21; outline-offset: 5px; }
@media (max-width: 700px) {
  .stage { align-items: center; justify-content: center; }
  .hero { width: 100%; max-width: 520px; margin: 0; align-items: flex-start; }
  .logo { font-size: clamp(82px, 25vw, 118px); }
  .fan { display: none; }
  .art { height: 62dvh; right: -18%; opacity: .42; }
  .cta { width: min(100%, 340px); min-height: 64px; }
}
@media (max-width: 380px), (max-height: 500px) and (max-width: 900px) {
  .art { display: none; }
}
```

Ensure the title plate/background keeps text readable over the mobile figure. Use only a single 240–340ms entrance sequence and disable it under `.p5-reduce`; remove `bgShift`, `p5-float`, and marquee usage from this screen.

- [ ] **Step 4: Typecheck and production-build the start change**

Run:

```bash
npm run build --workspace=@pacify/web
```

Expected: TypeScript and Vite both exit 0 with no missing asset import or unused symbol errors.

- [ ] **Step 5: Verify the start screen in a real browser**

At 360×800, 390×844, 844×390, 768×1024, 1440×900, and 1920×1080, confirm: no horizontal overflow; PACIFY and the CTA never clip; the old outline/slab/ghost letters/ticker are gone; no more than three cards appear; the figure disappears at the specified constrained sizes; the CTA remains at least 280×64 except when its width is capped by a narrower viewport; keyboard Enter/Space and touch activate exactly one navigation to `/menu`; console has no errors or asset 404s.

### Task 2: Rebuild the in-duel pause dialog

**Files:**
- Modify: `apps/web/src/screens/duel.tsx:286-328`
- Modify: `apps/web/src/screens/duel.tsx:2028-2104`
- Modify: `apps/web/src/screens/duel.tsx:3277-3341`
- Modify: `apps/web/src/screens/duel.module.css:492-721`

**Interfaces:**
- Consumes: `opts`, `updateOpts()`, `toggleFs()`, `fsOn`, `openPause()`, `closePause()`, `doForfeit()`, `forfeitConfirm`, `playHover()`, `playClick()`.
- Produces: `PauseSlider({ value, label, onPick }: { value: number; label: string; onPick: (value: number) => void })` and `useDialogFocus(active: boolean, onClose: () => void)`, which returns a dialog element ref; all existing option keys and forfeit behavior remain unchanged.

- [ ] **Step 1: Record the failing control audit**

Open `/duel?student=1`, then pause. At desktop and 360×800, inspect the current 34px close button, 44px mute buttons, 14px slider track, icon-only continue/forfeit actions, and X/check confirmation. Expected failing acceptance result: controls are not consistently labelled and several interaction areas fall below the 48px minimum.

- [ ] **Step 2: Replace pause markup with labelled semantic controls**

Keep the existing state setters and callbacks, but use native buttons, visible text, and a dialog name:

```tsx
<div className={`v ${s.pauseWrap}`} onClick={closePause}>
  <section
    className={`v ${s.pausePanel}`}
    role="dialog"
    aria-modal="true"
    aria-labelledby="pause-title"
    onClick={(event) => event.stopPropagation()}
  >
    <header className={`v ${s.pauseHead}`}>
      <div>
        <div className={`t ${s.pauseKicker}`}>DUEL // SYSTEM</div>
        <h2 id="pause-title" className={`t ${s.pauseTitle}`}>PAUSED</h2>
      </div>
      <button type="button" className={`press ${s.pClose}`} onClick={closePause} aria-label="Close pause menu">✕</button>
    </header>
    {/* labelled audio rows, fullscreen row, and text actions */}
  </section>
</div>
```

Use bus labels `MASTER`, `MUSIC`, `SFX`, `VOICE`; give each mute button `aria-pressed={b.muted}` and an accessible name such as `Mute music`/`Unmute music`. Show `MUTED` or `${b.vol}%`. Actions use these exact labels:

```tsx
<button type="button" className={`press ${s.pContinue}`} onClick={closePause}>▶ CONTINUE DUEL</button>
<button type="button" className={`press ${s.pForfeit}`} onClick={() => { playClick(); setForfeitConfirm(true); }}>FORFEIT DUEL</button>
```

The confirmation heading is `FORFEIT THE DUEL?`, with consequence copy and native `STAY IN DUEL` / `YES, FORFEIT` buttons wired to `closePause` and `doForfeit` respectively.

- [ ] **Step 3: Replace the custom slider with a native range input**

Retain pointer/touch volume updates through the browser’s accessible range behavior:

```tsx
function PauseSlider({ value, label, onPick }: {
  value: number;
  label: string;
  onPick: (value: number) => void;
}) {
  return (
    <input
      className={s.pRange}
      type="range"
      min="0"
      max="100"
      step="1"
      value={value}
      aria-label={`${label} volume`}
      onChange={(event) => onPick(Number(event.currentTarget.value))}
    />
  );
}
```

Pass the visible bus label at every call site. Do not change volume scaling: the stored value remains an integer from 0 through 100.

- [ ] **Step 4: Style the dialog for touch, keyboard, and short screens**

Replace the old pause CSS with a 720–780px desktop panel, full-screen narrow-sheet layout, 52–56px icon/mute controls, 56–64px actions, and a 44px range interaction area:

```css
.pauseWrap { position: absolute; inset: 0; z-index: 200; background: rgba(0,0,0,.86);
             align-items: center; justify-content: center; padding: max(16px, env(safe-area-inset-top))
             max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
.pausePanel { width: min(760px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto;
              background: #0b0b0b; color: #fff; border: 3px solid #f5efe1; box-shadow: 9px 9px 0 #000;
              padding: clamp(18px, 3vw, 34px); gap: 18px; }
.pauseTitle { font: clamp(48px, 7vw, 76px)/.95 "Anton", sans-serif; color: #fff; text-shadow: 5px 5px 0 #e60012; }
.pClose, .pIcoBtn { width: 56px; height: 56px; min-width: 56px; }
.pRow { display: grid; grid-template-columns: minmax(88px, 120px) 56px minmax(140px, 1fr) 64px;
        align-items: center; gap: 14px; min-height: 64px; }
.pRange { width: 100%; height: 44px; margin: 0; cursor: pointer; accent-color: #e60012; }
.pContinue { min-height: 64px; background: #fcee21; color: #000; font: 25px/1 "Anton", sans-serif; }
.pForfeit { min-height: 56px; border: 3px solid #e60012; color: #fff; font: 21px/1 "Anton", sans-serif; }
.pConfBtn { min-height: 58px; min-width: 180px; padding: 12px 20px; }
.pausePanel button:focus-visible, .pausePanel input:focus-visible { outline: 4px solid #fcee21; outline-offset: 4px; }
@media (max-width: 620px) {
  .pauseWrap { padding: 0; }
  .pausePanel { width: 100%; min-height: 100dvh; max-height: 100dvh; border: 0; padding:
                max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
                max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
  .pRow { grid-template-columns: 1fr 56px 64px; gap: 10px; }
  .pRange { grid-column: 1 / -1; grid-row: 2; }
}
```

Style `input[type=range]` track/thumb explicitly for WebKit and Firefox so the visual track is 10–12px and thumb is 26–28px, while the input itself stays 44px tall. Keep all text at least 16px. Use a short 180–260ms entry only.

- [ ] **Step 5: Add focus containment and background isolation**

When either duel dialog is open, make the scaled stage inert and hide/disable the pause trigger so background controls cannot receive pointer or keyboard focus. Add this hook near `useWindowDimensions`, attach its returned ref to the pause/log dialog element, and let each overlay keep its existing backdrop click handler:

```tsx
function useDialogFocus(active: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active || !dialogRef.current) return;
    const root = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const selector = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(selector));
    focusables()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [active]);

  return dialogRef;
}
```

Use `const pauseDialogRef = useDialogFocus(pauseOpen, forfeitConfirm ? () => setForfeitConfirm(false) : closePause);` and attach it to the pause `<section>`. When the forfeit confirmation opens, focus `STAY IN DUEL`; Escape from confirmation returns to the pause settings, while Escape from settings calls `closePause`. Remove the older pause/log Escape effects so they cannot fire twice. Apply `inert={pauseOpen || logOpen ? true : undefined}` to the stage and render the pause trigger only when neither dialog is open. Task 3 attaches the same hook to the log dialog; no focus-library dependency is added.

- [ ] **Step 6: Verify pause behavior and build**

Run:

```bash
npm run build --workspace=@pacify/web
npm run test --workspace=@pacify/web
```

Expected: both exit 0. In the browser, verify all four mute toggles, 0/50/100 slider positions by pointer and arrow keys, displayed values, fullscreen on/off, continue, backdrop/Escape close, BGM duck/restore, forfeit cancel, and forfeit confirmation. Repeat at 360×800 and 844×390; every target meets its minimum, no control clips, scrolling reaches the last action, and background cards cannot be activated.

### Task 3: Rebuild the table-log dialog as a clash case file

**Files:**
- Modify: `apps/web/src/screens/duel.tsx:1895-1904`
- Modify: `apps/web/src/screens/duel.tsx:2025-2034` (move the overlay outside the scaled stage)
- Modify: `apps/web/src/screens/duel.tsx:2173-2267`
- Modify: `apps/web/src/screens/duel.module.css:450-488`

**Interfaces:**
- Consumes: `TableLogOverlay({ closing, rows, oppName, currentRound, onClose })`, `PlayLogRow`, `CardFace`, `TOTAL_ROUNDS`, and the focus helper introduced in Task 2.
- Produces: the same overlay props and `playLog` data; internally adds selected-round state only. No log row shape or scoring calculation changes.

- [ ] **Step 1: Capture the failing log baseline**

Open the table log before any reveal and after rounds 1 and 7. Test 1440×900 and 360×800. Expected failing acceptance result: the fixed 1180px seven-column board is readable only as a desktop overview, card faces/labels are small, and the overlay inherits the duel stage scale instead of using real mobile pixels.

- [ ] **Step 2: Move the overlay into the real-pixel overlay layer**

Remove the `logOpen && <TableLogOverlay … />` block from inside `.stage` and render the same component as a sibling after the stage closes, alongside the pause overlay. Keep `TableLogPile` unchanged. Set `.logWrap` to `position: absolute; inset: 0; z-index: 200` so it is no longer affected by `transform: scale(stageScale)`. Apply the stage inert/focus behavior from Task 2 when `logOpen` is true.

- [ ] **Step 3: Add selected-round state without changing log data**

Initialize selection once per mounted overlay so reopening returns to the latest completed record:

```tsx
const [selectedRound, setSelectedRound] = useState(
  () => rows[rows.length - 1]?.round ?? currentRound,
);
const selected = rows.find((row) => row.round === selectedRound);
```

Render R1–R7 from `TOTAL_ROUNDS`. A round button is enabled only when its row exists; use `aria-pressed={selectedRound === round}` and `disabled={!row}`. Do not auto-change selection if a new row arrives while the player is reading. Compute display outcome directly from existing points:

```tsx
const outcome = !selected
  ? null
  : selected.youPts === selected.kleinPts
    ? "TIED"
    : selected.youPts > selected.kleinPts
      ? "WON"
      : "LOST";
```

- [ ] **Step 4: Replace seven columns with round navigation and one large clash record**

Use semantic sections and buttons with this content hierarchy:

```tsx
<section className={`v ${s.logPanel}`} role="dialog" aria-modal="true" aria-labelledby="log-title">
  <header className={`v ${s.logHead}`}>
    <div className={`t ${s.logHeadTag}`}>TABLE LOG</div>
    <h2 id="log-title" className={`t ${s.logTitle}`}>CLASH ARCHIVE</h2>
    <div className={`t ${s.logProg}`}>YOU VS {oppName}</div>
    <button type="button" className={`press ${s.logClose}`} onClick={onClose} aria-label="Close table log">✕</button>
  </header>
  {rows.length === 0 ? (
    <div className={`v ${s.logEmpty}`}>
      <div className={`t ${s.logEmptyTxt}`}>NO CLASHES RECORDED</div>
      <div className={`t ${s.logEmptySub}`}>Finish a round and its cards will be filed here.</div>
    </div>
  ) : (
    <div className={`v ${s.logBody}`}>
      <nav className={`v ${s.logRoundRail}`} aria-label="Completed rounds">{/* R1–R7 buttons */}</nav>
      <section className={`v ${s.logDetail}`} aria-live="polite">
        {/* ROUND n // CLASH RECORD; YOU card; VS; opponent card; points; outcome; note; running score */}
      </section>
    </div>
  )}
</section>
```

Reuse `CardFace` inside wrappers; do not use `LogMiniCard`. Each card gets a visible player label and `+{points}`. The outcome stamp reads `YOU TOOK THE CLASH`, `${oppName} TOOK THE CLASH`, or `CLASH TIED`; show `row.note` unchanged and running score as `TOTAL {youScore} — {kleinScore}`.

- [ ] **Step 5: Build the desktop rail and mobile tab layouts**

Use these concrete layout targets:

```css
.logWrap { position: absolute; inset: 0; z-index: 200; align-items: center; justify-content: center;
           background: rgba(0,0,0,.86); padding: max(16px, env(safe-area-inset-top))
           max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
.logPanel { width: min(1080px, 100%); height: min(760px, calc(100dvh - 32px)); overflow: hidden;
            background: #0b0b0b; border: 3px solid #f5efe1; box-shadow: 10px 10px 0 #000;
            padding: clamp(16px, 2.5vw, 30px); }
.logTitle { font: clamp(38px, 5vw, 64px)/1 "Anton", sans-serif; color: #fff; text-shadow: 5px 5px 0 #e60012; }
.logClose { width: 56px; height: 56px; min-width: 56px; }
.logBody { flex: 1; min-height: 0; display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 22px; }
.logRoundRail { min-height: 0; overflow-y: auto; gap: 8px; padding: 4px 8px 4px 4px; }
.logRoundBtn { min-height: 60px; padding: 8px 12px; text-align: left; border: 2px solid rgba(255,255,255,.35); }
.logRoundBtn[aria-pressed="true"] { border-color: #fcee21; background: #f5efe1; color: #111; box-shadow: 5px 5px 0 #e60012; }
.logDetail { min-height: 0; overflow-y: auto; align-items: center; justify-content: center; }
.logClashCards { flex-direction: row; align-items: center; justify-content: center; gap: clamp(16px, 3vw, 40px); }
.logCardW { width: clamp(144px, 15vw, 176px); aspect-ratio: 3 / 4; height: auto; }
.logPanel button:focus-visible { outline: 4px solid #fcee21; outline-offset: 3px; }
@media (max-width: 700px) {
  .logWrap { padding: 0; }
  .logPanel { width: 100%; height: 100dvh; max-height: none; border: 0; padding:
              max(14px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right))
              max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); }
  .logBody { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); gap: 12px; }
  .logRoundRail { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 4px 4px 10px; }
  .logRoundBtn { min-width: 68px; min-height: 60px; text-align: center; }
  .logCardW { width: clamp(112px, 34vw, 144px); }
  .logClashCards { gap: 12px; }
}
```

Disabled rounds remain legible at no less than 50% opacity and expose `IN PLAY`/`LOCKED` text. The detail area, not the whole page, scrolls. Keep entry motion under 340ms and remove the perpetual `IN PLAY` pulse.

- [ ] **Step 6: Verify data fidelity, responsiveness, and build**

Run:

```bash
npm run build --workspace=@pacify/web
npm run test --workspace=@pacify/web
```

Expected: both exit 0. In a real duel, verify empty, one-round, and seven-round states; latest-round default; WON/LOST/TIED records; trick notes; positive/zero points; running scores; long opponent names; disabled current/future rounds; no hidden card before reveal; close button/backdrop/Escape; focus containment/restoration. At 360×800 and 844×390, both cards remain at least 112px wide, round tabs remain at least 68×60, all content is reachable by scrolling, and there is no document-level horizontal overflow.

### Task 4: Cross-surface regression and device verification

**Files:**
- Review only: `apps/web/src/screens/start.tsx`
- Review only: `apps/web/src/screens/start.module.css`
- Review only: `apps/web/src/screens/duel.tsx`
- Review only: `apps/web/src/screens/duel.module.css`

**Interfaces:**
- Consumes: all three completed surfaces and the unchanged game/navigation/audio APIs.
- Produces: a verified UI-only diff with build/test and browser evidence; no new production interface.

- [ ] **Step 1: Run the complete web verification commands**

```bash
npm run test --workspace=@pacify/web
npm run build --workspace=@pacify/web
git diff --check
```

Expected: Vitest passes, TypeScript/Vite exit 0, and `git diff --check` prints no whitespace errors. Review `git diff` to confirm only the four planned UI files changed and no game/server/engine files were touched.

- [ ] **Step 2: Run the responsive browser matrix**

Use Chrome/Edge device emulation for 360×800, 390×844, 412×915, 844×390, 768×1024, 1440×900, and 1920×1080. For every size, capture start, pause, and a populated log. Check safe areas, orientation changes, browser zoom at 200%, text clipping, target sizes, scrolling, focus outlines, and console/asset errors. Then repeat the golden path on at least one real Android device or Android emulator in Chrome; emulation alone is not the Android sign-off.

- [ ] **Step 3: Exercise the complete user journey**

Navigate login/load → start → menu → campaign/story → duel. Confirm start CTA audio unlock and one heist transition; play rounds while opening/closing the log; pause during commit and during Klein’s response; change every audio setting; cancel and confirm forfeit in separate runs. Confirm no overlay reveals hidden information, no background card activates, no navigation duplicates, no timers/rules change, and normal rematch/result flows still work.

- [ ] **Step 4: Verify accessibility and reduced motion**

Using keyboard only, Tab and Shift+Tab through each dialog, activate buttons with Enter/Space, adjust every slider with arrows, close with Escape, and confirm focus returns to the invoking control. Enable the app’s reduced-motion setting and confirm decorative entry animations pause while all content and actions remain visible. Check that muted, selected round, winner, disabled round, and fullscreen states each have text/icon cues in addition to color.

- [ ] **Step 5: Perform the final design-quality pass**

Compare screenshots side by side at phone and desktop sizes. Reject the result if the start has more than one dominant focal point besides the CTA, if character art reduces text contrast, if any modal uses unexplained icon-only actions, if the log returns to tiny seven-column cards, or if decorations delay interaction. Remove a decorative layer rather than adding another effect when a composition feels crowded. Record the final screenshots and verification results for the user; make no success claim until the real-browser checks have actually run.
