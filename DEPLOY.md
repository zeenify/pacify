# Deploy Guide — put PACIFY online (professor demo)

Two deployable pieces:

| Piece | What | Where | Why |
|---|---|---|---|
| `pacify-server` | Fastify backend (`apps/server`) | **Render** (free) | Node server; already configured in `render.yaml` |
| `pacify-web` | Static export of the Expo web app (`apps/web`) | **Cloudflare Pages** (recommended) or Render static site | Pure static files; global CDN, free |

The repo is pre-configured for both: `render.yaml` defines BOTH services (Render
Blueprint), and `apps/web` exports to a static bundle (`web.output: "single"`).

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
   - `pacify-web`: `EXPO_PUBLIC_API_URL` = `https://pacify-server.onrender.com`
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
cd apps/web
EXPO_PUBLIC_API_URL=https://pacify-server.onrender.com npx expo export --platform web
```

Then in Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**
(direct upload) and drop the `apps/web/dist` folder. You get a `*.pages.dev` URL
immediately. (For git-connected CI instead: build command
`npx expo export --platform web`, output dir `apps/web/dist`, env `NODE_VERSION=22`
and `EXPO_PUBLIC_API_URL=...`.)

The repo ships `apps/web/public/_redirects` (`/* /index.html 200`) so refreshing a
deep link like `/duel` serves the app shell.

Bonus: `https://<host>/duel-prototype.html` still works standalone; against a deployed
server open it as `duel-prototype.html?api=https://pacify-server.onrender.com`
(that query override was added — it also falls back to the offline in-page brain).

---

## Checklist before sending the link

- [ ] `https://<server>/health` returns `{"ok":true}`
- [ ] Register/login works on the deployed site (proves DB + migrations)
- [ ] A full duel plays with Klein banter (proves LLM env; without key it plays with
      canned lines — still fine for the demo)
- [ ] Warmed up the backend (visit once ~60 s beforehand)
