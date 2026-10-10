# Checkpoint 3 — complete A/B simulator; incomplete Gemini cohort; browser blocked

Verified 10 October 2026. Running production URL: http://127.0.0.1:3010/demo#evaluation. Stop for review. No provider calls, paid spend, commits, pushes, deployments or old-repository changes.

## Changed files

- `lib/simulator.ts`: 30-day event accounting, independent policy worlds, nearest-market immediate dispatch A and best-feasible planner B, temporal shared storage, arrival-day settlement, cumulative spoilage and mass/paise conservation.
- `lib/simulation-replay.ts`: policy interface for HMAC-verified authentic exact-match replay; missing/mismatch/model failure/fallback/success classifications remain distinct. No SDK inference.
- `scripts/evaluate.ts`, `package.json`: reproducible generation and exact byte verification; fixture/source hashes and complete ledger exports. No new dependencies.
- `public/evaluation/benchmark.json`, `public/evaluation/manifest.json`: frozen A/B results and separately labelled incomplete C evidence.
- `components/Evaluation.tsx`, `app/demo/page.tsx`, `components/Explorer.tsx`, `app/globals.css`: frozen comparison on existing Demo Lab, evidence downloads and updated assumptions. Existing calculator, agent and visual design preserved.
- `tests/simulator.test.ts`: 11 meaningful tests including independent hand calculations, no future evidence, capacity ordering/releases, heat expiry, horizon inventory, failures, conservation/repeatability and authentic replay without network calls.
- `scripts/smoke_http.ts`, `tests/browser/demo.spec.ts`: authoritative displayed-value/download verification and expanded prepared browser acceptance. Eight browser tests remain unexecuted.
- `PLAN.md`, `README.md`, `BROWSER-CHECKS.md`, this report: checkpoint state and reproduction evidence.

## Frozen A/B results

Both worlds: original 30 lots, 5 markets, seed 42; 97,509 kg; independent identical initial resources; default Balanced risk for B. All 30 lots settled in each world. Zero infeasible decisions in this particular cohort; edge-case tests separately exercise failures.

| Result | A: nearest-market dispatch | B: best-feasible planner |
|---|---:|---:|
| Gross rupees | 2,997,542.35 | 3,058,863.73 |
| Transport rupees | 68,289.12 | 107,219.68 |
| Storage rupees | 0.00 | 4,013.86 |
| **Net rupees** | **2,929,253.23** | **2,947,630.19** |
| Sold kg | 85,250.33347011 | 82,086.90124468 |
| Spoiled kg | 12,258.66652989 | 15,422.09875532 |
| Unsold kg | 0.00 | 0.00 |

**B−A: +₹18,376.96 net, +3,163.43222544 kg spoilage. Kilograms saved = -3,163.43222544, a negative result.** B maximizes predicted net, not kilograms saved; no tuning or outcome hiding was performed. These are realized settlements inside an uncalibrated synthetic simulator, not field income or farmer impact.

Conservation errors: A -1.2732925824820995e-11 kg; B 0 kg (floating-point error; tolerance 0.000001 kg). Rupees reconcile exactly to paise. Full per-lot predictions, realized results, reservations, peaks and event ledgers are downloadable.

## Reproduction and identifiers

```sh
npm test
npm run evaluate
npm run evaluate:check
npx tsc --noEmit
npm run lint
npm run build
npm start
npm run test:server
npx playwright test --list # discovery only, no browser execution
```

Fixture verification additionally passed using bundled Python:

```sh
/Users/rudrapratapsingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/generate_world.py --check
/Users/rudrapratapsingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/verify_original.py
```

- Experiment ID: `6a1cacf24f72c39a0bc3acab281a896b3343277ff5658aed75a42c06031df5d9`.
- Benchmark artifact SHA256: `974bcbed112593026a6158d07ed95125265f690b7f1ddef4ffd7eac97ac95f69`.
- Fixture SHA256: `a6df67a925f9e4de968c9baa455bcad67baa47e46b1fffca210c7d6c07961659`.
- Manifest also binds geography, unchanged planner source, simulator source and replay adapter source.
- A/B each rerun from fresh worlds and compared deeply; frozen artifact byte comparisons pass. No generation timestamps or unseeded randomness.

## Scientific boundaries

Decisions receive only prices/weather through their harvest day. Observations are assumed available at the start of each day because the original specification provides daily, rather than intraday, evidence. Price forecast and original heat/spoilage quote engine are unchanged. Simulator settlement observes dispatch-day rain, cumulative daily temperature exposure, and price at floor(actual arrival day), strictly before day 30. Living produce still in transit at the horizon is unsold, with no invented payout. Lost produce never returns; sale and terminal expiry occur at most once per lot.

Cold storage reserves and bills original kg until departure or observed expiry, using half-open intervals. Existing releases are processed before same-time harvests; harvest ties use lot ID, candidate ties preserve the existing net/hold/ID rule. Booking all original kg is a conservative resource-accounting assumption. Rain is a 24-hour dispatch delay once, using origin-region weather for the journey. Transport is a fixed original-weight trip charge even if produce later expires in transit. Risk margins govern predicted eligibility; unexpected realized weather can invalidate the forecast. Baseline ignores soft risk margins while never selling expired produce. These choices are explicit synthetic assumptions, not calibrated biology, live road routing or validated safety limits.

## Policy C

Status **INCOMPLETE**, 1/30 evaluated. 1 authentic success; 29 missing; zero fallback/model-failure classifications in this saved cohort. Missing lots have null realized results and no assigned actions; complete C totals are null. The one replay is an isolated preview and cannot establish shared-resource cohort performance.

Exact original trace: `d1f8275c-6075-44a5-8161-032bd6ad065e`; SHA256 `693e459894c5be54169860fefede9fc7a0d22a0e03563f7d26437399bae04036`; model `gemini-3.1-flash-lite`. Actual saved usage: 2 requests, 11,403 input tokens, 152 output tokens. Initial ENOSPC-lost attempt remains unknown, outside this saved evidence. Replay rechecks lot/risk/scenario/fixture/tool versions/geography/candidates and storage evidence; changed contexts return mismatch. The adapter consumes the existing authentic record, not 30 extrapolated outcomes. The network-blocking replay integration test recorded zero fetch calls.

Further inference remains locked; the existing exclusive live claim was byte-identical before and after HTTP verification. A complete comparable C cohort needs separately approved free quota and genuine records for each exact simulation resource context. The current standalone storage trace cannot be reused when shared capacity evidence differs. No new 30-lot inference was executed.

## Actual gates and browser limitation

- `npm test`: **41 passed; 0 failed; 0 skipped** (16 agent + 14 planner + 11 simulator/replay).
- Fixture generation check and independent original-DOCX comparison: **PASS**, exact lots/prices/weather/storage.
- `npm run evaluate:check`: **PASS**, byte-identical artifact and manifest.
- `npx tsc --noEmit`: **PASS**, exit 0.
- `npm run lint`: **PASS**, exit 0, no warnings/errors.
- `npm run build`: **PASS**, exit 0; landing/demo/agent routes preserved.
- `npm run test:server`: **PASS**, all 30 SSR quotes, A/B displayed totals, downloadable SHA256, authentic replay/candidate consistency, invalid inputs/private-path/cross-origin rejection, repeated live-call rejection and unchanged claim. This is HTTP/server evidence, not browser acceptance.
- `npx playwright test --list`: **8 discovered; execution BLOCKED / NOT RUN**. Map, filters, slider, what-if, actual downloads/navigation, hydrated agent panel, responsive layout and console errors remain unverified.
- Final disk check: **6.1 GiB available**; filesystem is 97% used. No ENOSPC during these gates.

The prior browser security policy denied access to the local tab and explicitly prohibited alternate-browser workarounds. No alternate surface was launched. See `BROWSER-CHECKS.md` for the short manual acceptance checklist. No new browser screenshots are claimed.

Shortest safe next step after review: restore authorized browser access and run the eight prepared acceptance tests (or complete the manual checklist), fix/retest any failures, then record the existing landing → lot → trace → what-if → frozen evaluation journey. No new product features or Gemini calls are needed to record this partial, honestly labelled demonstration.
