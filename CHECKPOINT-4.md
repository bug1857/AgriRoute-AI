# Checkpoint 4 — implemented; browser acceptance BLOCKED

Official mandi fetching is deferred at the user's request. No further OGD requests are made by the workspace. No Gemini inference, paid calls, commits, pushes, deployment or CP5 work.

## Files and behavior

- `lib/live.ts`: strict bounded inputs, source-unit normalization and authoritative LIVE_ASSISTED candidate calculations. Reuses the original engine's heat/life, cold-aging, storage-capacity and 48h/24h/0h risk primitives. Money reconciles in paise; kilograms conserve mass. Weather impacts remain explicitly uncalibrated.
- `lib/live-providers.ts`: genuine Open-Meteo and OSRM adapters, 12-second timeout, 2 MiB response limit, HTTP/rate/schema errors, bounded caches, raw-response hashes, serialized OSRM requests at ≤1/second, server-owned 30-minute evidence snapshots. Prepared OGD adapter is paused; no official observations or forecasts are claimed.
- `lib/live-locations.ts`, `data/live-location-evidence.json`: actual fixed geocoding receipts. Jaipur city, Muhana Mandi Road and Chomu locality are locators, not verified farm/market gates. An unrelated Alwar Chomu match was rejected. Operational coordinates need human review/replacement.
- `app/api/live/route.ts`, `app/live/page.tsx`: local-only same-origin server calculations; client cannot inject price/road/weather evidence. Recalculate makes no provider calls; coordinate changes require refresh. No keys in API metadata.
- `components/LiveWorkspace.tsx`, `components/RoadMap.tsx`: separate forest-green/ivory workflow, actual road geometry, forecast receipts/validity, reviewed manual prices/storage/carrier inputs, conditional/unavailable decisions, device-only saving and private JSON export. No booking or guaranteed sale claims.
- `components/Header.tsx`, `components/Explorer.tsx`, `app/globals.css`: navigation to the live workspace and cohesive responsive styles; original synthetic Demo Lab preserved.
- `tests/live.test.ts`, `scripts/verify_live.ts`, `scripts/smoke_http.ts`: focused mocked tests plus explicit free-provider/server verification. Prepared browser navigation test extended; execution still blocked. `README.md`, `PLAN.md`, `BROWSER-CHECKS.md` updated.

## Authentic Jaipur example — 10 October 2026

Captured once through the running local server; saved privately in `private/checkpoint-4-live-example.json` (not publicly served).

- Open-Meteo retrieved **14:13:46.768 UTC / 19:43:46.768 IST**: 168 forecast hours, valid 10 Oct 00:00 UTC through 16 Oct 23:00 UTC. Dispatch-hour forecast temperature **29.1°C**, not an observed station measurement.
- Muhana road locator: OSRM retrieved **14:13:46.679 UTC**, **12.792 km**, **13.3233 minutes** car ETA, actual geometry.
- Chomu locality: OSRM retrieved **14:13:47.300 UTC**, **30.4662 km**, **27.8233 minutes** car ETA, actual geometry.
- Official mandi: **UNAVAILABLE / DEFERRED**, no requests in this refresh.
- Verification assumptions: 1,000 kg, Local tomato, five-day usable life, four-hour handling, one-day STORE, manual ₹35/₹40 per kg, declared ₹0.035/kg/km carrier tariff, ₹0.30/kg/day storage at 5°C, 1% fees. These are explicitly labelled test planning assumptions, not actual farmer facts, buyer offers or operational quotes. Coordinates/lot details unconfirmed; carrier/storage capacities and availability unknown.

Calculated estimates at **14:13:47.302 UTC**:

| Action / destination | Estimated net | Modeled spoilage | Status |
|---|---:|---:|---|
| SELL NOW / Muhana locator | ₹32,431.28 | 51.1112 kg | CONDITIONAL |
| REROUTE / Chomu locality | ₹36,419.05 | 53.3997 kg | CONDITIONAL |
| STORE / Chomu locality | ₹34,651.18 | 90.4672 kg | CONDITIONAL |
| STORE / Muhana locator | ₹30,837.37 | 88.4533 kg | CONDITIONAL |

REROUTE gross ₹37,864.01 − transport ₹1,066.32 − fees ₹378.64 = estimated net ₹36,419.05. Saleable 946.6003 + modeled loss 53.3997 = 1,000 kg. These are estimates, not realized benefits. A 10% manual-price reduction recalculated on the same authoritative snapshot without provider calls. Coordinate mismatch was rejected. API JSON exactly matched the calculator.

Private example SHA-256: `c5e0645788e207b5564b550a83eca5ff347debf962bee44f9e587ce162a14b02`.

Response hashes: weather `aa3f841dbd3f6e88f3aabb53f9fc23799d4cec28bf77b64689fbc57d46b72386`; Muhana `f0ce4076954f266654847797ed2e9867cf7dea14b64f10183e6523339af760b4`; Chomu `93ecfec394bcf60841f6d79fd0f162a15396d61a4b7cd040cbd6a0588a005c66`. Hashes identify captured responses; they are not provider signatures.

## Quality gates

- `npm test`: **57 PASS, 0 FAIL** — 16 agent, 16 live, 14 original planner, 11 simulator. Mocks never become authentic provider/AI evidence. Added tests cover dimensional conversions, strict identities/timestamps, independent money checks, conservation, eligibility, rain preceding-hour semantics, missing/stale/conflicting data, capacity/expiry, snapshot ownership/expiry, timeouts/rate/oversize/key redaction and local API authority.
- `npx tsc --noEmit`: **PASS**, exit 0.
- `npm run lint`: **PASS**, exit 0.
- `npm run build`: **PASS**, exit 0; `/live` and `/api/live` included.
- `npm run test:server`: **PASS** — all 30 synthetic SSR quote values, frozen A/B displayed totals/download SHA, authentic Gemini replay, inference lock/unchanged claim, live SSR/metadata, forbidden-origin/oversize rejection, private/environment URLs 404.
- `node --env-file=.env.local --import tsx scripts/verify_live.ts`: **PASS**, one free refresh, genuine weather/two road routes, authoritative recalculation, no Gemini/OGD inference or fetching.
- `npm run evaluate:check`: **PASS**, exact original frozen artifact reproduction.
- `npx playwright test --list`: **8 discovered, NOT EXECUTED**. Existing security denial prohibits alternate-browser bypass. Map/filter/risk/what-if/export/hydration/trace/navigation/mobile/keyboard/runtime/loading/error acceptance remains BLOCKED/UNVERIFIED. See `BROWSER-CHECKS.md`; HTTP/unit gates do not prove browser behavior.
- Credentials configured but never printed; `.env.local` mode **0600**. Public/generated browser assets scanned for both actual keys: **no exposure**. Private evidence URL returns 404. No new dependencies. Disk available approximately **6.3 GiB**.

## Scientific integrity

A net ₹29,29,253.23 / spoiled 12,258.66653 kg; B net ₹29,47,630.19 / spoiled 15,422.09876 kg. B−A net **+₹18,376.96**, spoilage **+3,163.43223 kg (worse)**. These reproduce; they were not forced or hardcoded.

Experiment `6a1cacf24f72c39a0bc3acab281a896b3343277ff5658aed75a42c06031df5d9`; artifact `974bcbed112593026a6158d07ed95125265f690b7f1ddef4ffd7eac97ac95f69`. Original fixture, engine/simulator/evaluation and Gemini integration unchanged. Policy C **INCOMPLETE 1/30**, full-cohort totals unavailable; inference remains locked. The live workflow cannot modify this benchmark.

## Access, licence and remaining limits

- [Open-Meteo terms](https://open-meteo.com/en/terms): free API for noncommercial use, bounded requests; data CC BY 4.0 with attribution. [Hourly documentation](https://open-meteo.com/en/docs): temperature forecast and preceding-hour rain. No SLA or crop-specific calibration. Commercial access would require separate review; no paid account was enabled.
- [OSRM demo policy](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server) / [operator](https://routing.openstreetmap.de/about.html): worldwide car routes, reasonable noncommercial requests, maximum one per second and attribution; no reliability guarantee. OpenStreetMap ODbL. No live traffic, carrier availability, truck access or gate guarantees.
- Fixed geocoding used [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) and Open-Meteo/GeoNames; raw receipts retained. No generic autocomplete or bulk geocoding was added.
- OGD key is configured but official-price fetch is paused. Prior request encountered network connection refusal; validity of the key was not established. No fabricated market history or forecast is displayed.
- Real operational quotes, actual gate coordinates and calibrated spoilage remain unverified. Unknown facts stay conditional/unavailable. Browser approval is still blocked; no screenshots claimed.

Running site: http://127.0.0.1:3010/live (original demo: `/demo`).

Next after review only: CP5 readability/contrast, compact decision/evidence tabs, authentic trace/receipts access, licensed crop-selection photography and data-backed graphs. Browser verification remains a gate. No demo recording yet. **STOP for CP4 review.**
