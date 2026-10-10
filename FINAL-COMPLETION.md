# AgriRoute completion gate — 10 October 2026

Local implementation and acceptance: **17/20 verified PASS features (85%)**. F11/F12 and F17 remain incomplete at the explicit provider authorization gate. No new Gemini inference, commits, pushes, deployment, tags or submission PDF.

The request preserves the already accepted F01–F10/F18/F19 without repeating their individual titles. Their existing scope is retained and regression-tested; no new titles or requirements are inferred here.

| Feature | Status | Evidence |
|---|---|---|
| F01 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F02 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F03 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F04 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F05 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F06 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F07 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F08 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F09 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F10 | PASS | Existing accepted core preserved; regression and browser acceptance pass. |
| F11 | PARTIAL | Frozen A/B verified; complete sequential C infrastructure tested with mocks; real C incomplete. |
| F12 | PARTIAL | Original authentic lot_id 1 verified; durable context-bound capture/replay tested; further calls locked. |
| F13 | PASS | Server financial sensitivity, market/risk controls, observed B reservations, refined switches and non-monotonic paise ties tested. |
| F14 | PASS | Separate seed 20261010, 4 crops, 3 scenarios, 365 days, 4,380 records; reproducible and visibly synthetic. |
| F15 | PASS | Real local PostgreSQL auth, tenant/role isolation, idempotency, concurrent review, immutable approvals/audit and protected exports tested. |
| F16 | PASS | 11 actual Chromium desktop/mobile journeys pass, including existing eight acceptance tests. |
| F17 | BLOCKED | Official SDK adapter, source grounding and persisted human review implemented/tested; no real extraction authorized or claimed. |
| F18 | PASS | Existing accepted implementation retained; integrated regression and browser acceptance pass. |
| F19 | PASS | Existing accepted implementation retained; integrated regression and browser acceptance pass. |
| F20 | PASS | Assigned farmer reads the exact approved snapshot in Hindi; mobile/print, money, unauthorized and stale-reference checks pass. |

## Implemented workflows and changed files

- **Coordinator → approved record → Hindi Farmer View:** `lib/database.ts`, `lib/coordinator.ts`, `lib/workflow-error.ts`, `lib/farmer-record.ts`, `scripts/setup_database.ts`, `app/api/session/route.ts`, `app/api/coordinator/route.ts`, `app/coordinator/page.tsx`, `app/farmer/[id]/page.tsx`, `components/CoordinatorWorkspace.tsx`, `components/FarmerDecision.tsx`, `app/coordinator.css`. Coordinator creates/updates a lot, requests authoritative candidates, saves a pending snapshot, then approves/rejects with identity/time. Farmer assignment, latest approval, lot version, snapshot hash and active reviewed buyer terms are checked on every protected view/export. Withdrawn/expired terms invalidate active views while preserving history. No private public links.
- **Gemini cohort capture/replay:** `lib/agent.ts`, `lib/agent-types.ts`, `lib/evaluation-capture.ts`, `lib/provider-authorization.ts`, `scripts/cohort.ts`, `app/api/cohort/route.ts`. Existing original tools/trace remain exact for the original default context. The separate versioned shared context binds observed evidence, reservations and the actual prompt/tool contract. Six individual executed tools/seven model requests maximum. Model requests, results and final selection must match signed receipts. Records cannot overwrite earlier records; manifest writes are atomic; malformed records are reported. Failed calls/fallbacks stay separate. Three Balanced lots have no eligible candidate: shared runs still require five tools and a grounded null selection, classified as verified infeasible rather than invented success.
- **What-if:** `lib/whatif.ts`, `app/api/whatif/route.ts`, `components/WhatIfAnalysis.tsx`, `components/Explorer.tsx`. Price/rain/storage bounds, destination filtering, financial/spoilage deltas and optional frozen Policy B reservations observed before the selected harvest. Competitive intersections and paise-rounding events are evaluated through the real planner, including repeated non-monotonic SELL/REROUTE tie reversals. Thresholds are bounded numerical brackets, not calibrated safety limits or guaranteed income. Earlier lots are not reoptimized when inspecting the B capacity snapshot.
- **Offer review:** `lib/offer-model.ts`, `lib/offers.ts`, coordinator workflow/UI above. Official SDK adapter validates normalized values against exact excerpts in all three languages; injected SDK tests are visibly mocked. Missing/contradictory commitments stay unfilled. Persistent confirm/correct/reject/withdraw/expiry workflows retain source evidence, corrections and model metadata when present. Only authorized confirmed terms reach the server planner. Manual/rule fallbacks work while Gemini is locked.
- **Integration/security:** `components/LotMap.tsx` fixes nested map controls and pointer interception; `lib/local-api.ts` and coordinator origin checks correctly handle Next's internal host normalization without accepting foreign origins. `components/MandiWorkspace.tsx` adds the exact visible synthetic label. `components/Header.tsx`, `app/layout.tsx`, `.env.example`, `package.json`, `package-lock.json`, `next.config.ts` connect navigation/fonts/PostgreSQL/test gates and exclude private files/environment/artifacts from deployment output tracing. The existing uncommitted `app/polish.css` and chart tests are preserved. Automated unit tests hard-lock real providers; browser acceptance refuses an environment containing an inference approval file.
- **Tests/reproduction:** `tests/coordinator.test.ts`, `tests/cohort.test.ts`, `tests/whatif.test.ts`, `tests/offers.test.ts`, `tests/browser/workflow.spec.ts`, `tests/browser/demo.spec.ts`, `scripts/evaluate.ts`. PostgreSQL is an actual independent service, not a mocked/in-memory database.

## Verification

- `npm test`: **94 passed, 0 failed, 0 skipped**. Includes real database adversarial authorization/concurrency/persistence tests, 30 sequential mock cohort outcomes (27 feasible selections + 3 verified infeasible), source grounding and actual non-monotonic financial switches.
- `npm run test:browser`: **11 passed, 0 failed** in actual headless Chromium. Map, crop/region filters, risk, what-if, matching downloads, navigation/keyboard/tabs, authentic trace replay, mobile overflow, coordinator approval, assigned Farmer View, protected export, stale references, persistent reviewed offers and inference lock.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test:server`, `git diff --check`: PASS. Final production build has no Turbopack warning. Eight API output traces exclude private runtime records, database files and environment files.
- `node --import tsx scripts/generate_mandi.ts --check`: PASS; SHA-256 `080af6034f0480625084362ef6681d11a1fb10cdc1c6cae08ebebe3a8ef262fc`.
- Bundled Python `scripts/verify_original.py`: PASS against the actual DOCX/Numpy/Pandas reference. System Python lacked pandas; the supplied bundled runtime completed the check.
- `npm run evaluate:check`: PASS. Every scientific output, source dataset/geography identity and original artifact checksum matches. Code source hashes now differ because of the bounded forecast-horizon fix and added classification type; these current hashes are reported separately, rather than rewriting frozen provenance. `evaluate` refuses to overwrite an existing frozen artifact.
- `npm audit --omit=dev`: **0 runtime vulnerabilities**. Full audit reports **5 high development-tool dependency findings** in the ESLint/fast-glob/micromatch/braces chain; its proposed downgrade is incompatible with the current Next toolchain, so it was not forced.
- About **6 GiB disk free** after verification. Git was aligned with `origin/main`; no repository mutations outside this project.

Browser evidence: `artifacts/browser/demo-desktop.png`, `demo-mobile.png`, `farmer-print.png`. Auth browser traces are disabled and disposable test account sessions/passwords are revoked/rotated; no real account credentials are included in screenshots.

## Preserved scientific results

| Policy | Realized synthetic net | Spoiled kg |
|---|---:|---:|
| A, nearest immediate | ₹29,29,253.23 | 12,258.666530 |
| B, deterministic | ₹29,47,630.19 | 15,422.098755 |
| C | INCOMPLETE — no full-cohort total | INCOMPLETE |

B − A: **+₹18,376.96 net; +3,163.432225 kg spoilage**. More spoilage, not kilograms saved. Frozen artifact SHA-256 `974bcbed112593026a6158d07ed95125265f690b7f1ddef4ffd7eac97ac95f69`; experiment `6a1cacf24f72c39a0bc3acab281a896b3343277ff5658aed75a42c06031df5d9`. Original world, A/B artifact, original replay adapter, Gemini single-run gate and authentic trace remain unchanged.

## Provider gate — STOP before any new inference

- Existing authentic runs: **1/30**, lot_id **1** (displayed Lot 02), five tools/two model requests, 11,403 recorded input tokens/152 output tokens. No new inference this completion pass; authorized paid spend remains zero.
- No authentic record exists for lot IDs **0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29**.
- Comparable sequential cohort prefix: **0/30** until its first chronological lot is captured. Next is lot_id **5** (displayed Lot 06). The legacy record is reused only if its eventual shared context matches exactly; it is never relabelled.
- Model proposed: `gemini-3.1-flash-lite`. One next-lot run: maximum **7 model requests / 6 individual tools**. Full remaining budget is **203 requests / 174 tools if the legacy record can be reused**, or **210 requests / 180 tools if all 30 shared contexts need new records**. One genuine buyer-message extraction requires a separate purpose-specific approval for **1 model request**, no routing tools.
- Current available quota/billing for these additional calls: **UNVERIFIED**. Earlier free-tier evidence is preserved, but no fresh provider verification/authorization has been claimed. Approval must explicitly bind purpose, lot IDs, expiry and a worst-case request budget; fresh free-tier/billing-disabled/quota proof must pass before SDK initialization. No HTTP endpoint can create this approval. Unit tests cannot call providers even if an approval exists.
- Local replay command: `node --env-file=.env.local --import tsx scripts/cohort.ts`. Capture command exists but is locked: `node --env-file=.env.local --import tsx scripts/cohort.ts --capture-next`. Do not run capture until separately approved.

## Database and local access

- Working site: http://127.0.0.1:3010; workspace `/coordinator`, original `/demo`, `/live`, `/mandi` retained.
- Local PostgreSQL listens on **127.0.0.1:55432**, durable data in ignored `private/postgres`. Sign-in accounts are in ignored, owner-readable `private/local-accounts.json`; keys/passwords are never printed or committed. `.env.local` contains the local database connection. This is local PostgreSQL persistence, not authenticated cloud persistence.
- Provision/check: `node --env-file=.env.local --import tsx scripts/setup_database.ts`. Start the site with `npm run start` after build. A stopped local database must be started with its existing `pg_ctl` data directory; do not reinitialize it.
- Hosted database, HTTPS/production origin and controlled storage for evaluation artifacts are not provisioned or deployment-tested. Runtime-only private receipts and inference approval files are deliberately not packaged for deployment. Deployment remains unapproved.

**Exact next action:** review the Coordinator → approved Hindi view locally, then provide fresh quota/billing-disabled evidence and explicitly authorize one shared-context run for lot_id 5, maximum seven model requests/six tools, free tier only. That is the next evidence gate, not an automatic 30-lot batch.
