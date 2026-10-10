# Synthetic mandi + reviewed buyer offers — implementation evidence

Running local page: http://127.0.0.1:3010/mandi. Existing `/demo` and `/live` preserved. No recording, deployment, commits, paid calls or new provider inference.

## Implemented

- `lib/mandi.ts`, `lib/mandi-data.ts`, `data/synthetic-mandi.json`, `data/synthetic-mandi.manifest.json`, `scripts/generate_mandi.ts`: reproducible synthetic generator, normalized units, contiguous as-of history, trailing trend, capped 0–7 day forecasts, modeled weather and original financial/storage/spoilage/48h/24h/0h helpers. Original fixtures/calculator/simulator/Gemini source remain unchanged.
- `app/mandi/page.tsx`, `components/MandiWorkspace.tsx`, `app/api/mandi/route.ts`, `lib/local-api.ts`: premium existing shared tabs/styles, visible synthetic provenance, actual time-series chart, comparisons, editable feasibility/what-if inputs, authoritative server candidates, byte-exact dataset download and bounded local-only requests. Header/Explorer navigation and CSS updated.
- `lib/offers.ts`, `lib/offer-store.ts`, `app/api/offers/route.ts`, `components/BuyerOfferReview.tsx`: labelled local extraction, Hindi/English/Hinglish and Devanagari digits, verbatim character spans, missing/ambiguity/cancellation warnings, editable normalized terms, manual entry, required human acknowledgement, immutable confirmation receipt/corrections/hash and rejection/withdrawal. Only confirmed server-held IDs enter the scenario planner; crop/weight/destination/date/deadline/risk/capacity are validated again. Local memory expires at 30 minutes; no cloud/public URL.
- `lib/offer-model.ts`: official installed SDK schema/grounding adapter tested solely with injected mocked responses. Live mode throws before provider invocation; UI/API offer extraction is **local rules, not Gemini**. Original routing agent remains locked and authentic traces retain their inputs/provenance.
- `tests/mandi.test.ts`, `tests/offers.test.ts`, `scripts/smoke_mandi.ts`: reproducibility, financial/date/unit/no-future-leak boundaries, multilingual extraction, review/withdrawal, mock model grounding/lock, HTTP export/hash and confirmed-only cross-route planner integration. Existing regression/HTTP gates retained.

## Data and calculations

Generator `agriroute.synthetic-mandi.v1`; seed **20261010**; **4,380** rows (4 crops × 3 fictional scenario markets × 365 dates), 2026-01-01 through 2026-12-31. Includes minimum/modal/maximum in ₹/quintal and ₹/kg, deterministic daily/weekly/annual movements and 36 glut events. Invented ranges and phases, not calibrated field evidence. Visible label: **Synthetic Mandi Data — For Demonstration**.

Fixture SHA-256: `080af6034f0480625084362ef6681d11a1fb10cdc1c6cae08ebebe3a8ef262fc`.

Simulated tomato, Muhana-inspired scenario, 2026-10-10: min **₹1,788.67/quintal**, modal **₹1,906.48/quintal = ₹19.0648/kg**, max **₹2,085.69/quintal**. Seven-day bounded forecast **₹19.25/kg**, target Oct 17. Forecasts use only as-of history, require at least three records for future estimates, clip at ±35% of current price and never use future generated weather/prices. Bounds are assumptions, not confidence intervals.

Default 1,000kg/5-day-life/Balanced scenario: eligible immediate Chomu reroute, 959.702576kg modeled saleable; **₹20,792.05 gross − ₹1,169.97 transport − ₹0 storage = ₹19,622.08 estimated net**. A synthetic test buyer message, human confirmed for 500kg at ₹35/kg to Chomu, gives 479.851288kg saleable and **₹16,794.80 − ₹584.98 = ₹16,209.82 estimated net**. These are calculated scenario outcomes, not actual farmer benefits or guaranteed buyer commitments.

Buyer terms can change only after human confirmation. Quantity means loaded lot weight; settlement on surviving weight assumes partial delivery acceptance. Grade rejection, payment timing and booking are not financially modeled. Offer validity/deadlines use selected simulated calendar dates; human-entered scenario terms are not historically verified observations. Unknown delivery deadline stays conditional. Original source warnings and corrected fields remain in the receipt.

Normalized dated price records are provider-independent; future official/CSV adapters must preserve distinct provenance/mode and verification. LIVE_ASSISTED continues with reviewed manual prices; the OGD key is unused and official access was not retried.

## Verification

- `npm test`: **77 passed, 0 failed**, including the original five-tool/parallel six-invocation cap, candidate validity, timeout/quota and authentic-replay regressions. SDK model responses mocked only.
- `npx tsc --noEmit`: **PASS**. `npm run lint`: **PASS**. `npm run build`: **PASS** with `/mandi`, `/api/mandi`, `/api/offers` added.
- `node --import tsx scripts/generate_mandi.ts --check`: **PASS**, exact bytes and manifest.
- `node --import tsx scripts/smoke_mandi.ts`: **PASS**, production API financial equality, synthetic export SHA, all three languages, human review/manual correction/withdrawal, cross-route confirmed IDs and mode/inference locks. No external requests.
- `npm run test:server`: **PASS**, existing 30 displayed quotes, authentic trace/candidate replay, inference lock, LIVE_ASSISTED metadata/manual separation, frozen artifact bytes/totals and unchanged live claim. No inference.
- `npm run evaluate:check`: **PASS**, original experiment `6a1cacf24f72c39a0bc3acab281a896b3343277ff5658aed75a42c06031df5d9`, artifact SHA `974bcbed112593026a6158d07ed95125265f690b7f1ddef4ffd7eac97ac95f69`; A ₹2,929,253.23 net, B ₹2,947,630.19, B spoils **3,163.43kg more**. Policy C still INCOMPLETE 1/30.
- Credential exposure scan: **85 public/browser asset files**, both configured keys checked without printing them, **no exposure**; `.env.local` mode **0600**. Free disk approximately **6.2GiB**.
- Browser hydration, interaction, mobile rendering, downloads and console: **BLOCKED / NOT RUN** under the earlier explicit security restriction; no alternate-browser bypass. Manual steps added to `BROWSER-CHECKS.md`; no new screenshot is claimed.

Production verification caught and fixed decimal-literal serialization noise in unit validation (tolerance 1e-9, far below paisa precision); wrong units and NaN still fail. HTTP smoke also confirmed a changed mango/rain scenario can legitimately have no eligible candidate; no recommendation was fabricated to make it pass.

Remaining limits: local rules require explicit supported currency/units and labelled delivery/payment clauses; free-form prose needs manual clarification. Gemini offer inference remains locked until separately authorized. Operational quotes, forecast/spoilage calibration and browser acceptance are incomplete. Stop for review.
