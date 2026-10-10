# AgriRoute AI · Round 2 prototype

**Licence scope:** The MIT licence applies only to original AgriRoute AI source code developed with Codex assistance, to the extent the project owner holds licensing rights. Third-party assets, dependencies, services, datasets and non-code material are excluded. See [LICENSE_SCOPE.md](LICENSE_SCOPE.md).

Original Project 1 synthetic world with a premium website, deterministic planner and genuine server-side Gemini function calling. The seed-42 shared-capacity 30-day A/B evaluation is frozen. One original isolated Gemini run and one newly verified shared-capacity run are stored locally; the comparable Policy C cohort remains **INCOMPLETE at 1/30**, with further inference locked. Coordinator approvals persist in PostgreSQL and feed the authorized Hindi Farmer View. Farmer/Coordinator navigation and a device-saved dark/light theme are available. The original Demo Lab prices, weather, farms, markets, storage availability and transport estimates are synthetic. Quote results are estimates, not realized benefits.

Use Node.js 24 and PostgreSQL. Copy the template, then configure `DATABASE_URL` for an existing database. For a fresh local macOS database, leave `DATABASE_URL` absent: `setup_database.ts` expects Homebrew PostgreSQL executables in `/opt/homebrew/bin`, provisions a dedicated cluster on port 55432 and writes ignored local account credentials. If that cluster already exists, restore its existing connection configuration; do not reinitialize it. Gemini is optional for local replay/planning and no provider calls are made by setup or tests.

```sh
npm ci
cp .env.example .env.local # configure your database; never commit keys
node --env-file=.env.local --import tsx scripts/setup_database.ts
npm run dev # http://127.0.0.1:3010
npm test
npm run lint
npm run build
npm run evaluate:check # frozen A/B reproduction; never overwrite the frozen artifact
npm run test:server # running local server required; no inference
npm run test:browser # installed Playwright Chromium and running local server required
```

Fixture generation uses NumPy (recorded version in `data/provenance.json`); independent DOCX comparison also needs pandas. The bundled Codex Python runtime contains both.

```sh
python3 scripts/generate_world.py --check
python3 scripts/verify_original.py
```

Read `PLAN.md` for the declared policy/model assumptions. UI reference files are design references only; no old project code was copied. Deployment and authenticated cloud persistence are not configured. Paid provider spend is not authorized.

Gemini uses the official `@google/genai` SDK and `gemini-3.1-flash-lite`. The key belongs only in ignored `.env.local`. Free tier, billing disabled and model quota must be freshly verified in ignored `private/free-tier-verification.json` (deliberately disabled template supplied). Model metadata is checked before generation; auto retries are disabled. A persistent exclusive claim limits this checkpoint to its authorized live attempt. Each run allows six individual tool requests and at most seven model requests. Current live allowance is consumed; authentic replay calls no inference API. No general public agent endpoint: local host and same-origin access only.

Versioned records in `private/traces` contain actual SDK requests/responses, tool arguments/results/timestamps, original inputs, fixture/context hashes, server-selected candidate values and explicit failure/fallback status. Local HMAC detects record modification; it is not a Google signature or authenticated cloud persistence. Changed controls never relabel an old trace. Mocked tests cannot enter the genuine replay store. Before inference, storage is checked; progress is recorded before another model request. Disk failures remain possible and must never be disguised as successful saved runs.

See `FINAL-COMPLETION.md` for the completion gate and `ONE-LOT-VERIFICATION.md` for the subsequent genuine shared-capacity run. Verification: 94 unit/integration tests and 12 Chromium browser tests passed; typecheck, lint and production build passed. The subsequent one-lot run also passed fresh-process trace/financial/conservation replay and focused browser acceptance. Older checkpoint/browser documents are historical, not the current acceptance status. Private traces, screenshots, account passwords and PostgreSQL files are intentionally excluded from this repository; a fresh clone does not contain those local records.

Open `/coordinator` to create, plan and review lots; approved immutable snapshots are visible to the assigned farmer through `/farmer`. Confirmed buyer terms require human review before influencing the planner. Sign-in sessions, tenant/role checks, protected exports and append-only review history are database-backed. Fresh local provisioning saves account credentials only in ignored `private/local-accounts.json`. A hosted PostgreSQL service, HTTPS/production origin and controlled evidence storage are required before deployment.

`node --env-file=.env.local --import tsx scripts/cohort.ts` verifies saved shared-capacity records without inference. Captures require a purpose-specific human approval, fresh free-tier/billing-disabled/quota proof and an exact lot/request budget. Further routing and buyer-extraction inference remain locked; do not run `--capture-next` without approval. Current shared cohort: one successful lot, zero failures/mismatches; full Policy C totals remain withheld. The original isolated trace is never relabelled as a shared-capacity result.

Hero landscape: Unsplash image `photo-1500382017468-9049fed747ef`, stored locally to avoid a runtime image dependency. Fonts: locally bundled Manrope from Fontsource. Map tiles: OpenStreetMap, normal interactive viewing with attribution; no offline prefetch. Fictional lot markers remain interactive without the basemap.

Checkpoint 4 adds `/live`: a separate LIVE_ASSISTED Jaipur-tomato workflow using free noncommercial Open-Meteo forecasts and OSRM road geometry, with source timestamps and response hashes. Actual farm/market-gate coordinates and operational quotes require human review; defaults are geographic locators. Weather delay/spoilage are declared, uncalibrated prototype assumptions. Human prices, storage and carrier availability remain conditional until reviewed/confirmed; no bookings or guaranteed sale proceeds.

Official OGD/AGMARKNET fetching is out of scope for this release. LIVE_ASSISTED continues using explicitly reviewed manual prices, with no synthetic price substitution and no Gemini inference. Fetch weather/road evidence explicitly; recalculation uses a server-owned snapshot without provider calls. Its browser-local saving remains labelled “Saved on this device.” Restoring requires fresh evidence. Private exports must not be published as real farmer impact.

`node --env-file=.env.local --import tsx scripts/verify_live.ts` performs one free weather/two-route refresh plus server recalculation checks, saving a private evidence example with clearly declared verification assumptions. Do not run repeatedly just to refresh a timestamp. See `CHECKPOINT-4.md` for the captured run and provider/licence limits.

`/mandi` is a separate **Synthetic Mandi Data — For Demonstration** workspace: seed 20261010, four crops × three Rajasthan-inspired fictional market scenarios × 365 dates. History, trends, bounded forecasts and financial/feasibility recalculation use generated data, never LIVE_ASSISTED observations. The original seed-42 world and frozen A/B artifacts are unchanged. `node --import tsx scripts/generate_mandi.ts --check` verifies exact fixture bytes; omit `--check` only to intentionally regenerate this separate fixture.

The Mandi Lab Buyer offers tab retains its visibly labelled local rule-based Hindi/English/Hinglish parser and manual fallback; its temporary reviews expire after 30 minutes and clear on server restart. The protected Coordinator Reviewed buyer offers workflow separately persists drafts, human corrections/confirmations, withdrawal, expiry and evidence in PostgreSQL. Only authorized human-confirmed terms affect that planner. An official Gemini SDK extraction adapter is implemented and tested with injected mocks, but genuine extraction remains locked pending separate authorization. No independently verified buyer commitment or authenticated cloud persistence is claimed. `node --import tsx scripts/smoke_mandi.ts` checks the running local Mandi workflow without external provider calls.
