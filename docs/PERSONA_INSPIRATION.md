# Persona UI Inspiration — Pacify

> Pick what you like from each. We will **not** copy 1:1 — we take patterns, colors, animations, and asset *ideas* and remix them for Pacify's own style.

**How to use this file:** Open every link below (GitHub + live demo). Screenshot / note what you like: "I like the P3 Reload water ripple", "I like P5 red starburst", etc. Tell me and I'll extract the exact CSS/Skia code.

---

## P5 — Rebellion Red / Punk Collage (your main direction)

### 1. ffaneto/persona5-website-theme — **BEST STARTER**
- Repo: https://github.com/ffaneto/persona5-website-theme
- Stack: React + Vite, custom CSS
- Steal ideas: **wiggle polygon keyframes** (`P5Menu.jsx`), **stripe wipe page transitions** (`PageTransition.jsx`), BGM player, SFX on hover (`select.mp3`), background video layering
- Assets: `main1.mp4` ambient loop, `select.mp3`, polygon CSS

### 2. Omicron69/persona5-style-portfolio — CLEANEST CODE
- Repo: https://github.com/Omicron69/persona5-style-portfolio
- Live: GitHub Pages (enable in repo)
- Steal ideas: **ransom-note lettering** (per-letter tilt/boxes in `view.js`), **wipe transition**, **animated cursor strips** (30-frame sprites in `assets/cursors`), per-screen menu backgrounds (`assets/menus/home.jpg` etc.)
- Assets: cursor sprites, menu BGs, `style.css` :root colors, `sfx/select.mp3`

### 3. bruhdev1290/persona-5-style-portfolio — MOST MODERN
- Repo: https://github.com/bruhdev1290/persona-5-style-portfolio
- Stack: React + TypeScript + Tailwind + Framer Motion
- Steal ideas: **red/black/white palette in tailwind.config.js**, Framer Motion menu stingers, responsive bento for mobile web
- Assets: Tailwind palette, `persona5-portfolio.tsx` component structure

### 4. flow4u11/myportfolio — THEMING ENGINE
- Repo: https://github.com/flow4u11/myportfolio
- Steal ideas: **theme switcher** (Persona 5 vs Default/Light/Christmas) to see how they swap palettes, GSAP ScrollTrigger, Lenis smooth scroll, masonry grid

### 5. DracoY-code/phansite — PHAN-SITE TRIBUTE
- Repo: https://github.com/DracoY-code/phansite
- Steal ideas: Phantom Aficionado Website recreation — chat/forum UI that fits Pacify's "school rumor board" vibe if we add a lore screen

---

## P3 Reload — Sea Blue / Water / Sorrow (great contrast to P5)

### 6. RohitPoul/Person-3-Reload-Potfolio
- Repo: https://github.com/RohitPoul/Person-3-Reload-Potfolio/
- Colors: `#dc2626` red / `#3ce2ff` blue / `#0a0e27` dark navy
- Steal ideas: **P3 Reload nav** (`P3Menu.jsx`), CD player BGM, Framer Motion page transitions, GitHub API live stats

### 7. deltea/p3r-pause-menu — **MUST SEE LIVE**
- Repo: https://github.com/deltea/p3r-pause-menu
- **Live demo: https://p3r.deltea.space**
- Stack: Svelte + SvelteKit + Tailwind
- Steal ideas: **perfect 1:1 P3R pause menu**, blur + water distortion, double-circle mask transitions, triangle cursor masks
- Blog: https://www.deltea.space/blog/p3r-pause-menu

### 8. Ultipuk/persona_3_reload_pause_menu — GODOT DEEP DIVE
- Repo: https://github.com/Ultipuk/persona_3_reload_pause_menu
- **Live demo: https://ultipuk.xyz/apps/persona-3-reload-ui/**
- Blog: https://ultipuk.xyz/blog/recreation-of-persona-3-reload-ui/
- Steal ideas: shader breakdown (sinusoidal water, bubble/noise masks, Gaussian blur + gradients, `add` blend confetti polygons, text ripple/shimmer). Best technical writeup.

### 9. emmajsadams/minerva — DESIGN SYSTEM DOC
- Repo: https://github.com/emmajsadams/minerva
- Steal ideas: full **P3 Reload design system** documented: palette `#00BBFA` electric blue / `#79D7FD` light aqua / `#001736` navy / `#ffc54a` gold, glass morphism, oceanic icons (organic curves, translucent layers, bubble motifs). Copy the principles doc directly.

### 10. Yujonpradhananga/Persona-Quickshell — HYPRAND QUICKSHELL
- Repo: https://github.com/Yujonpradhananga/Persona-Quickshell
- Steal ideas: QML + Hyprland theming, P3R quickshell widgets

---

## P4 Golden — Investigation Yellow / Bento (warm, pop)

### 11. Ninjaruss/ninjaruss.net — **P4G BENTO**
- Repo: https://github.com/Ninjaruss/ninjaruss.net
- **Live: https://ninjaruss.net**
- Colors: `#F5C518` golden-yellow / charcoal / cream, Archivo Black + Inter
- Steal ideas: **CSS Grid bento system** — perfect for Pacify's campaign map (13 Student cards as bento tiles)

---

## Cross-Game (P1 → P5X)

### 12. HamzaKarrouchi/personadle
- Repo: https://github.com/HamzaKarrouchi/personadle
- **Live: https://personadle.net/**
- Covers P1 → P5X (6 game modes, SVG P5 UI)
- Steal ideas: **SVG filter effects**, dynamic transitions, badge system, how to theme one codebase for all Persona eras

### 13. Sentovibes/persona-companion-app
- Repo: https://github.com/Sentovibes/persona-companion-app
- Steal ideas: table of themes per game — `P3 Reload: Indigo Blue / P5 Royal: Rebellion Red / P4 Golden: Investigation Yellow` — great reference for assigning each of your 13 Students a distinct P-era palette

### 14. HamzaKarrouchi/Persona_GRUB_Themes
- Repo: https://github.com/HamzaKarrouchi/Persona_GRUB_Themes
- 70+ themes: 13× P5 Royal + 42× P5X + 13× P3 Reload, each character a unique color scheme
- Steal ideas: **per-character palettes** — steal a Student's accent color directly from its name (e.g. Joker red, Makoto blue, etc.)

---

## What to tell me next

For each link you open, reply like:
> "P5 ffaneto — love the wiggle polygon + stripe wipe, want that"
> "P3 deltea — love the water blur, take the blue palette #00BBFA for Student 7"
> "P4 ninjaruss — love the bento grid for campaign map"
> "Don't like P3 gold confetti"

I'll then pull the exact code/assets for the ones you picked and build Pacify's ui-kit from the mix.
