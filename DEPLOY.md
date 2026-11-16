# Deploy Guide — put PACIFY online (professor demo)

Two deployable pieces:

| Piece | What | Where | Why |
|---|---|---|---|
| `pacify-server` | Fastify backend (`apps/server`) | **Render** (free) | Node server; already configured in `render.yaml` |
| `pacify-web` | Static build of the Ionic React web app (`apps/web`) | **Cloudflare Pages** (recommended) or Render static site | Pure static files; global CDN, free |

The repo is pre-configured for both: `render.yaml` defines BOTH services (Render
Blueprint), and `apps/web` builds to a static SPA bundle via Vite (`vite build`).

---

## 0. What you need (prerequisites)

1. **The repo pushed to GitHub** (Render/CF Pages deploy from git; or use direct upload).
2. **A Postgres database** — required for login/guest accounts and progress.
   Recommended: [Neon](https://neon.tech) free tier (no expiry, `sslmode=require`).
   (Render's own free Postgres works too but time-expires.)
3. **One LLM key** for Klein's personality — copy the same LLM_* variables you have in
   your local `.env` (Cloudflare Workers AI, Azure, or Gemini — whatever `LLM_PROVIDER`
   you use locally). Without any key the duel STILL plays (canned-line fallback in
   `personality.ts`), just without the live LLM banter.
4. Answer to "is the solver too heavy for Render?": **No.** The solver is a memoized
   bitset search — ~0.3–4 s CPU bursts per pick, tiny memory. The free plan handles it;
   total round latency is dominated by the LLM call anyway.

---

## Option A — everything on Render (one dashboard)

1. **Push the repo to GitHub.**
2. Render dashboard → **New + → Blueprint** → pick the repo. Render reads
   `render.yaml` and creates `pacify-server` + `pacify-web`.
3. **Set env vars BEFORE the first build builds the web service** (it bakes the API
   URL into the JS bundle at build time):
   - `pacify-server`: `DATABASE_URL` = your Neon connection string
     (`postgresql://...?sslmode=require`), `LLM_PROVIDER` + its keys (same as local),
     optional `GEMINI_API_KEY`.
   - `pacify-web`: `VITE_API_URL` = `https://pacify-server.onrender.com`
     (Render shows the actual URL after creation — set it, then trigger a manual
     deploy of pacify-web).
4. **Migrate the database once**, from your machine with the cloud URL:
   ```bash
   # paste Neon DATABASE_URL into packages/db/.env, then:
   npm run db:migrate
   ```
5. Create the demo account via the app's login screen (register form) — done.
6. Send your professor the `pacify-web` URL.

⚠️ Free-tier gotcha: Render services sleep after ~15 min idle and take ~1 min to wake.
Open the site a minute before the demo (or ping /health) so it's warm.

---

## Option B — backend Render, frontend Cloudflare Pages

Backend: same as Option A step 2–5 (you can delete/skip the `pacify-web` service).

Frontend, fastest path (no CI): build locally, drag-and-drop:

```bash
VITE_API_URL=https://pacify-server.onrender.com npm run build --workspace=@pacify/web
```

Then in Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**
(direct upload) and drop the `apps/web/dist` folder. You get a `*.pages.dev` URL
immediately. (For git-connected CI instead: build command
`npm install && npm run build --workspace=@pacify/web`, output dir `apps/web/dist`,
env `NODE_VERSION=22` and `VITE_API_URL=...`.)

The repo ships `apps/web/public/_redirects` (`/* /index.html 200`) so refreshing a
deep link like `/duel` serves the app shell.

Bonus: `https://<host>/duel-prototype.html` still works standalone; against a deployed
server open it as `duel-prototype.html?api=https://pacify-server.onrender.com`
(that query override was added — it also falls back to the offline in-page brain).

---

## Klein's voice (Fish Audio) — optional, server-only

Voice is OFF unless **every** setting below is valid. Missing or invalid config is
safe by design: the game plays text-only and never silently switches to a paid model.

Set these ONLY on the `pacify-server` service (Render dashboard → Environment, or
your local `apps/server/.env`) — never on `pacify-web` and never in any `VITE_*`
variable, so the browser bundle never sees the key:

| Var | Value | Notes |
|---|---|---|
| `FISH_ENABLED` | `true` | Voice stays off otherwise. |
| `FISH_API_KEY` | your Fish Audio key | Server-only secret. **Rotate any key that was ever pasted into chat before live use**; enter the replacement directly here / in your secret store, never in source or client env. |
| `FISH_MODEL` | `s2.1-pro-free` | Pinned — the server accepts exactly this string; a typo disables voice instead of falling back to Fish's paid model. Fish documents free access through **2026-11-30** (fair-use limits, no latency guarantee). When it lapses, voice turns off; don't switch to a paid model unless you explicitly decide to. |
| `FISH_KLEIN_VOICE_ID` | `ec47a6d54dbe4e1481f66e1d6a94b849` | The "Thoma" public clone. ⚠️ Community clone, **not** marked as Fish-licensed — its availability or title on Fish is not proof of rights clearance for a public release. |
| `FISH_ALLOWED_ORIGINS` | your web URL, e.g. `https://pacify-web.onrender.com` | Comma-separated exact browser origins allowed to request speech; must match the deployed web URL. |

Privacy: with voice on, Fish receives the exact spoken dialogue text — which may
include the player's chosen name — and Fish's terms allow using submitted data for
model improvement. Keep voice optional and disclose this before any public release.

Account authorization: speech is issued only to signed-in accounts. The server
hands out short-lived, signed speech tickets bound to the exact server-generated
line and the requesting account; `/voice` rejects tampered, expired, or
cross-account tickets and applies per-account rate limits. Anonymous players keep
full text-only gameplay.

---

## Checklist before sending the link

- [ ] `https://<server>/health` returns `{"ok":true}`
- [ ] Register/login works on the deployed site (proves DB + migrations)
- [ ] A full duel plays with Klein banter (proves LLM env; without key it plays with
      canned lines — still fine for the demo)
- [ ] Warmed up the backend (visit once ~60 s beforehand)
- [ ] (Optional) Voice: with `FISH_*` set on the server, a spoken Klein line plays
      from the deployed origin; without it the game still plays fine text-only.
