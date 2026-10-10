# AgriRoute AI · Round 2 prototype

**Licence scope:** The MIT licence applies only to original AgriRoute AI source code developed with Codex assistance, to the extent the project owner holds licensing rights. Third-party assets, dependencies, services, datasets and non-code material are excluded. See [LICENSE_SCOPE.md](LICENSE_SCOPE.md).

Original Project 1 synthetic world with a premium website, deterministic planner and genuine server-side Gemini function calling. Checkpoint 3 adds a reproducible shared-capacity 30-day A/B simulation and frozen evaluation in the existing Demo Lab. One authentic five-tool Gemini run is available only as an exact-match isolated replay; Policy C remains INCOMPLETE at 1/30 and inference is locked. Browser acceptance remains blocked. The original Demo Lab prices, weather, farms, markets, storage availability and transport estimates are synthetic. Quote results are estimates, not realized benefits.

```sh
npm install
npm run dev # http://127.0.0.1:3010
npm test
npm run lint
npm run build
npm run evaluate # A/B plus authentic local replay only; no inference
npm run evaluate:check # exact frozen-artifact reproduction
npm run test:server # running local server required; no inference
# npm run test:browser only after browser permission is restored
```

Fixture generation uses NumPy (recorded version in `data/provenance.json`); independent DOCX comparison also needs pandas. The bundled Codex Python runtime contains both.

```sh
python3 scripts/generate_world.py --check
python3 scripts/verify_original.py
```

Read `PLAN.md` for the approved order and declared policy/model assumptions. No commits, pushes, paid API calls or deployments have been performed. UI reference files are design references only; no old project code was copied.

Gemini uses the official `@google/genai` SDK and `gemini-3.1-flash-lite`. The key belongs only in ignored `.env.local`. Free tier, billing disabled and model quota must be freshly verified in ignored `private/free-tier-verification.json` (deliberately disabled template supplied). Model metadata is checked before generation; auto retries are disabled. A persistent exclusive claim limits this checkpoint to its authorized live attempt. Each run allows six individual tool requests and at most seven model requests. Current live allowance is consumed; authentic replay calls no inference API. No general public agent endpoint: local host and same-origin access only.

Versioned records in `private/traces` contain actual SDK requests/responses, tool arguments/results/timestamps, original inputs, fixture/context hashes, server-selected candidate values and explicit failure/fallback status. Local HMAC detects record modification; it is not a Google signature or authenticated cloud persistence. Changed controls never relabel an old trace. Mocked tests cannot enter the genuine replay store. Before inference, storage is checked; progress is recorded before another model request. Disk failures remain possible and must never be disguised as successful saved runs.

See `CHECKPOINT-3.md` for simulator results, reproduction identifiers and current verification. See `CHECKPOINT-2.md` for actual live evidence and the first attempt's ENOSPC failure. See `BROWSER-CHECKS.md` for unverified browser checks.

Hero landscape: Unsplash image `photo-1500382017468-9049fed747ef`, stored locally to avoid a runtime image dependency. Fonts: locally bundled Manrope from Fontsource. Map tiles: OpenStreetMap, normal interactive viewing with attribution; no offline prefetch. Fictional lot markers remain interactive without the basemap.

Checkpoint 4 adds `/live`: a separate LIVE_ASSISTED Jaipur-tomato workflow using free noncommercial Open-Meteo forecasts and OSRM road geometry, with source timestamps and response hashes. Actual farm/market-gate coordinates and operational quotes require human review; defaults are geographic locators. Weather delay/spoilage are declared, uncalibrated prototype assumptions. Human prices, storage and carrier availability remain conditional until reviewed/confirmed; no bookings or guaranteed sale proceeds.

Official OGD/AGMARKNET fetching is deferred at the user's request. The ignored `.env.local` key remains server-side and is unused while deferred. No synthetic source fallback and no Gemini calls in this workflow. Fetch explicitly; recalculation uses a server-owned snapshot without provider calls. Saving is browser-local only, labelled “Saved on this device.” Restoring requires fresh evidence. Private exports must not be published as real farmer impact.

`node --env-file=.env.local --import tsx scripts/verify_live.ts` performs one free weather/two-route refresh plus server recalculation checks, saving a private evidence example with clearly declared verification assumptions. Do not run repeatedly just to refresh a timestamp. See `CHECKPOINT-4.md` for the captured run and provider/licence limits.

`/mandi` is a separate **Synthetic Mandi Data — For Demonstration** workspace: seed 20261010, four crops × three Rajasthan-inspired fictional market scenarios × 365 dates. History, trends, bounded forecasts and financial/feasibility recalculation use generated data, never LIVE_ASSISTED observations. The original seed-42 world and frozen A/B artifacts are unchanged. `node --import tsx scripts/generate_mandi.ts --check` verifies exact fixture bytes; omit `--check` only to intentionally regenerate this separate fixture.

The Buyer offers tab uses a visibly labelled local rule-based Hindi/English/Hinglish parser, with manual fallback. Verbatim evidence, editable normalized terms, explicit human confirmation and withdrawal are functional; only server-confirmed IDs may affect this scenario planner. Reviews expire after 30 minutes in local server memory; a restart clears them. No authenticated cloud persistence or verified buyer commitment is claimed. Gemini extraction is locked; SDK extraction tests use only injected mocks. See `MANDI-OFFERS-CHECKPOINT.md` for evidence and limitations. `node --import tsx scripts/smoke_mandi.ts` checks the running production HTTP workflow without any external provider calls. Browser acceptance remains blocked, not passed.
