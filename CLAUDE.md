# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — starts the **whole app** (Express API + Vite dev middleware) on `http://localhost:3000` via `tsx server.ts`. There is no separate frontend dev server; do not run `vite` directly for development.
- `npm run build` — `vite build` → outputs the client SPA to `dist/`.
- `npm run preview` — serve a production build (`vite preview`).
- `npm run lint` — `tsc --noEmit` type-check. This is the only check; there is no test suite and no ESLint config.
- `npm run clean` — `rm -rf dist`.

A `.env` file is required before `npm run dev` works (MySQL must be reachable — `initDatabase()` runs before the server listens). Copy from `.env.example`.

Deployment (server-side, `/data/hitech/node1/app/hitech-web`): `bash deploy.sh` — git pull → `npm ci` → `npm run build` → `pm2 restart hitech-web` (see `ecosystem.config.cjs`, `hitech-web常用命令.md`, `DEPLOY.md`). PM2 runs `server.ts` directly through `tsx`; there is no server-side compile step.

## Architecture

Single-process full-stack app: one Express server (`server.ts`) serves both the JSON API and the React client (Vite middleware in dev, static `dist/` in prod). The client is a React 19 + Vite + Tailwind v4 SPA under `src/`.

**This is a lead-generation website for 苏州和毅智能科技有限公司 (HeYi Intelligent), deployed at `http://ai.hitech.xin/hitech/`.** A public site hosts an AI "数字合伙人" (digital partner) chatbot that qualifies visitors into sales leads; an internal 透明工厂 dashboard and an `/admin` panel manage those leads, case studies, and legal pages.

### The `/hitech/` base path — read this before touching any URL

`vite.config.ts` sets `base: '/hitech/'` in production mode only (`'/'` in dev). Consequences that bite:

- **Every client fetch and route must go through `import.meta.env.BASE_URL`** — e.g. `fetch(\`${base}api/chat\`)`, `route === \`${base}admin\``. A hardcoded `/api/...` breaks in production. All five components already follow this; match it.
- Nginx (`nginx.conf` / `heyi.conf`) proxies `/hitech/api/` → `http://localhost:3000/api/` (prefix stripped), and serves `dist/` for `/hitech/`.
- `server.ts` also has a defensive middleware that strips a leading `/hitech` from `/hitech/api/*` in case a proxy forwards it unstripped, plus a `301 /admin → /hitech/admin` redirect in production.

### Server (`server.ts`, ~830 lines)

Everything server-side lives in this one file: DB init, all API routes, the AI proxy, and admin auth.

- **Database is MySQL** via `mysql2/promise` pool. `initDatabase()` creates the DB, creates tables, runs idempotent `ALTER TABLE ... ADD COLUMN` migrations (`addColumnIfNotExists`), and seeds `cases`, `stats`, and `legal_pages` (`INSERT IGNORE`, so admin edits survive restarts). **Add new columns to `initDatabase()`, not just to `schema.sql`** — `schema.sql` is a standalone reference mirror and is never executed by the app.
- Tables: `leads`, `messages` (chat history keyed by `session_id`), `cases`, `legal_pages`, `visitors`, `stats`, `activity_logs`.
- **AI chat** (`POST /api/chat`) proxies to **Zhipu GLM** (`https://open.bigmodel.cn/api/paas/v4/chat/completions`, model from `ZHIPU_MODEL`). The system prompt, the full company profile (business license details), persona rules, and lead-qualification goals are **hardcoded inline in this route** — that is where you edit the persona. Relevant case studies come from `searchRelevantCases()` (keyword + industry scoring over the `cases` table) and are injected into the prompt (lightweight RAG). Both turns are persisted to `messages`. Requests are non-streaming despite the SSE-friendly nginx config.
- **`POST /api/leads` upserts by `session_id`** (updates if a lead for that session exists, inserts otherwise) so a remount does not create duplicates. `stats.leads_captured` increments only on insert.
- **Admin API** (`/api/admin/*`) is gated by `requireAdmin`, which checks an **in-memory** `adminTokens` map with a 24h expiry — all admin sessions are invalidated by a restart/redeploy. Login compares plaintext against `ADMIN_USERNAME`/`ADMIN_PASSWORD`.
- `fetchWithRetry()` wraps the outbound AI call, retrying transient network errors (ENOTFOUND/ECONNRESET/ETIMEDOUT).

### Client (`src/`)

- `App.tsx` — root; **routing is hand-rolled** via `window.location.pathname` + `history.pushState` + `popstate` (no router lib). Routes: `${base}admin` → `AdminPanel`, `${base}privacy` / `${base}terms` → `LegalPage`; otherwise a `view` state toggles the public site vs. the internal `Dashboard`. **All hooks must stay above these early returns** — a past white-screen bug came from violating hook order here.
- `components/ChatInterface.tsx` — the chatbot. **Lead extraction and scoring are client-side here, not on the server**: after each AI reply, while `!leadSaved`, it regex-scans the whole conversation for contact info (mobile, landline, contextual 7–12 digit numbers, email, WeChat), industry, and name, computes heuristic scores from turn count, builds a `conversation_summary`, and `POST`s to `/api/leads` **only once real contact info is found**. Deliberately independent of `chatState`, so a visitor who drops off right after sharing contact still gets captured. Session id lives in `localStorage` (`heyi_session_id`); `genUUID()` falls back off `crypto.randomUUID` for plain-HTTP (non-secure-context) access. Also has Web Speech API (`zh-CN`) voice input.
- The welcome message is **not persisted to the DB** — on remount it is re-prepended to the loaded history, with a dedupe check.
- `components/Dashboard.tsx` (polls leads / dashboard-stats / activity-logs every 5s), `StatsDisplay.tsx` (posts a visitor record, polls `/api/stats` every 10s).
- `components/AdminPanel.tsx` — three tabs (`leads` / `cases` / `legal`) doing CRUD against `/api/admin/*`; token in `localStorage` (`admin_token`).
- `components/LegalPage.tsx` — renders `legal_pages` content (Markdown) fetched from `/api/legal/:key`.
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge).

## Conventions and gotchas

- UI copy, prompts, and the persona are **Chinese**; match that and the neo-brutalist visual style (`#141414` on `#E4E3E0`, hard `shadow-[8px_8px_0px_0px]` boxes, mono uppercase micro-labels) when editing the frontend.
- The AI persona must always identify as "和毅智能数字合伙人" and never as "合一数智" or any other name (enforced by prompt rules in `/api/chat`).
- **Ignore the Gemini / AI Studio scaffolding.** `README.md`, `metadata.json`, and `vite.config.ts`'s `process.env.GEMINI_API_KEY` define are leftover template boilerplate. The app uses Zhipu GLM via `ZHIPU_API_KEY` / `ZHIPU_MODEL`.
- The app loads config with `dotenv.config()`, i.e. **`.env` only**. `.env.production` is a checked-in reference copy, not something the runtime reads — the deploy flow expects a real `.env` on the server (`deploy.sh` aborts without one).
- `nginx.conf` proxies `/hitech/health` → `/api/health`, but **no `/api/health` route exists** in `server.ts`; that health check currently 404s.
- Repo also carries ops artifacts that are not application code: `nginx.conf` / `heyi.conf` (+ `.bak`), `ssl/`, `deploy.sh`, `ecosystem.config.cjs`, an ICP/site-verification `.txt`, and Chinese ops docs (`DEPLOY.md`, `变更日志.md`, `阿里云ECS服务器设置SSHKEY.md`).
