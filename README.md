# LoL Coach

Personalized coaching companion for League of Legends (Overwolf desktop + overlay).

## Requirements

- Windows
- [Overwolf](https://www.overwolf.com/)
- Node.js (LTS)
- npm
- Riot Developer API key
- OpenAI API key (Phase 9 AI Coach; currently disabled in UI)

## Development

```bash
npm install
npm run dev
```

For Overwolf:

```bash
npm run build
```

Load the unpacked app from `dist/` in Overwolf developer tools.

```bash
npm run typecheck
npm run lint
npm run build
```

## Setup

1. Copy `.env.example` → `.env`
2. Set `VITE_RIOT_API_KEY`
3. (Optional / later) Set `VITE_OPENAI_API_KEY` and flip `AI_COACH_ENABLED` in `src/core/config/app.ts`
4. `npm run build`
5. In Settings: Riot ID `GameName#TAG`, pick 2–3 role priorities, language
6. Import champion pool

## Current phase

```text
Phases 0–9 complete
```

## Implemented

- Overwolf foundation + lifecycle + draft/session coaching
- Riot sync (la2 / americas), pool, counters, heat maps
- Session Coach
- Personal analytics (role/champion breakdowns, insights, last10 vs baseline)
- AI Coach (implemented; **disabled** via `AI_COACH_ENABLED` until ready)
- i18n EN + ES

## Product site (Riot Product URL)

Static compliance landing lives in `docs/` (Privacy + Terms).

Publish with GitHub Pages (`Settings → Pages → Deploy from branch → /docs`).
Example URL: `https://<username>.github.io/loltrainee/`

## Publish on Overwolf

Overwolf requires **developer whitelist** before store / OPK install. Order:

### 1) Local test (today)

1. Install [Overwolf Developers client](https://download.overwolf.com/install/Download?Channel=developers)
2. `npm run build`
3. Overwolf → Settings → Support → **Development options** → Load unpacked extension → select `dist/`
4. Set Riot ID in Settings, import pool, play a game and verify overlay (`Ctrl+*`)

### 2) App proposal (required to publish)

1. Create / log in: https://www.overwolf.com/app-proposal-submission-form/login-form
2. Submit proposal (English) for **LoL Coach** — coaching / learning only, no automation, no fog abuse
3. Wait for DevRel approval / whitelist (often a few business days)

### 3) Package + submit

```bash
npm run pack:opk
```

Creates `release/lol-coach-<version>.opk` from `dist/` (manifest without local `developer` auto-refresh).

Then:

1. Validate manifest: https://dev.overwolf.com/ow-native/reference/manifest/validate-your-manifest/
2. Submit OPK via Overwolf submission flow / DevRel QA
3. Prepare store assets after console access:
   - Tile `258×198` JPG
   - Icon `55×55` PNG
   - Screenshots `1200×750` JPG (≤100KB each)
   - Store description ≤2000 chars

Docs: https://dev.overwolf.com/

## Monetization (future)

Overwolf apps commonly monetize with:

1. **Overwolf Ads (Ads SDK)** — rewarded / display ads in desktop windows (not invasive in-game). Best first step for a free coaching app.
2. **Premium subscription** — unlock AI Coach quota, deeper analytics, multi-account, export.
3. **Cosmetic / supporter pack** — themes, overlay skins (no gameplay power).

Recommended path:
- Keep core coaching free (pool, draft call, session, personal analytics)
- Gate **AI Coach** or higher AI usage behind premium **or** show a non-intrusive ad unit on the desktop dashboard between sessions
- Never put ads over critical in-game decision moments

Ads require Overwolf Ads SDK integration + policy compliance (separate phase).

## Roadmap

```text
Phase 0 - Foundation
Phase 1 - League lifecycle detection
Phase 2 - Champion Select integration
Phase 3 - Coaching knowledge base
Phase 4 - Draft Coach
Phase 5 - In-game Focus Overlay
Phase 6 - Post-game analytics
Phase 7 - Session Coach
Phase 8 - Personal analytics
Phase 9 - AI Coach
Phase 10 (optional) - Overwolf Ads + Premium
```

## Design constraints

Coaching and learning only — no automation, no hidden information, no unfair advantage systems.
