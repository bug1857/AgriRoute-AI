# Evaluation, evidence and reproducibility

[← README](../README.md) · [Architecture](ARCHITECTURE.md) · [Local development](LOCAL_DEVELOPMENT.md) · [Deployment](DEPLOYMENT_AND_LIMITATIONS.md)

AgriRoute AI separates **(a) controlled synthetic simulation**, **(b) one authentic bounded model tool-calling trace**, and **(c) separate local weather/route evidence**. They are different evidentiary categories and should not be conflated.

## Experiment definition

- **Fixture:** seed 42, **30 lots**, **5 markets**, frozen weather and market series; `data/provenance.json` records the source and SHA-256.
- **Horizon:** 30 days, with shared storage-capacity constraints and observed dispatch/arrival/settlement conditions.
- **Policy A:** nearest-market immediate dispatch baseline; this reference rule does not apply the planner's soft usable-life margin.
- **Policy B:** deterministic feasible-planner selection under the documented Balanced risk setting.
- **Policy C:** genuine Gemini sequential decisions with validated tools and receipts; **incomplete at 1/30**.
- **Controls:** matched frozen starting world and initial resources; separate policy runs and event ledgers; predicted and realized proceeds are different quantities.

Source: `lib/simulator.ts`, `lib/planner.ts`, `scripts/evaluate.ts` and `public/evaluation/benchmark.json`.

## Frozen A/B results

| Quantity (30 synthetic lots) | Policy A | Policy B |
| --- | ---: | ---: |
| Initial mass | 97,509.00 kg | 97,509.00 kg |
| Sold | 85,250.33 kg | 82,086.90 kg |
| Spoiled | 12,258.67 kg | 15,422.10 kg |
| Unsold | 0.00 kg | 0.00 kg |
| Realized simulated net | ₹2,929,253.23 | ₹2,947,630.19 |

**Policy B minus A:** **+₹18,376.96** simulated net (**+0.627%**) and **+3,163.43 kg** modeled spoilage. **This fixture does not demonstrate saved produce.** It illustrates a trade-off: a modestly higher monetary outcome can coexist with more spoilage. No farm deployment or causal field benefit was measured.

The original artifact is preserved in `public/evaluation/benchmark.json` with identity/checksums in `public/evaluation/manifest.json`. `data/world-source.ts` preserves exact source text for the frozen `world.json` representation. New experiments must be stored separately, not silently substituted for this benchmark.

## One authentic Gemini record—not a cohort claim

The author-verified bounded run reported in [`ONE-LOT-VERIFICATION.md`](../ONE-LOT-VERIFICATION.md) uses:

- Model: `gemini-3.1-flash-lite` via the official Google GenAI SDK.
- Shared-capacity **Lot 06**, potato, **4,964 kg**, West region, Balanced policy.
- **2 actual model requests** and **5 successful tool invocations** (`get_price_forecast`, `get_weather`, `check_storage`, `estimate_spoilage`, `transport_cost`).
- Selected `market_1:0` → **REROUTE / Market B**.
- Server-validated **estimated** net: **₹171,489.19**; simulated settlement in that isolated replay, not observed farmer income.
- Authenticated context/trace replay remains **local and private**; trace signature is a local HMAC, not a Google signature.

The comparable sequential Policy C cohort contains **1/30 completed decisions**. The remaining 29 outcomes—and a full Policy C total or A/B/C uplift comparison—are **not known** and are not invented.

## Other evidence boundaries

| Evidence | Supported observation | Not established |
| --- | --- | --- |
| Synthetic Mandi Lab | Seed 20261010, four crops, three fictional market scenarios, 365 dated rows per crop/market | Official AGMARKNET prices or reliable real market predictions |
| Local Live Assisted | Captured Open-Meteo forecast and OSRM **car-profile** routes, with timestamps and receipts | Verified carrier/truck availability, official mandi pricing, confirmed storage booking or guaranteed net proceeds |
| Coordinator and Farmer View | Local database-backed review, protected approved snapshots, Hindi output and mobile/export acceptance | Production end-to-end database/login acceptance without separate hosted validation |
| Multilingual offers | Local rule-based parser, manual fallback, persistent reviewed Coordinator offers; Gemini SDK adapter exercised with mocks | Authentic Gemini buyer-extraction accuracy or measured user time savings |
| A/B simulation | Exact frozen outcomes and mass accounting | Farm-level randomized effect, calibrated perishability model or causal generalization |

## Reproduction

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
python3 scripts/generate_world.py --check
node --import tsx scripts/generate_mandi.ts --check
npm run evaluate:check
```

Run browser acceptance only against an initialized **local** PostgreSQL database and the correct local server:

```bash
npm run test:browser
```

Some historical checks require private authentic records or the external original DOCX unavailable in a fresh public clone. Record any missing prerequisite honestly instead of substituting a simulated model trace.

**Last integrated local acceptance recorded:** 11 October 2026 — **97/97 Node** and **14/14 Chromium browser** tests, plus typecheck, build and frozen evaluation verification. These counts are not a hosted security/operational acceptance test.

## Research integrity checklist

1. Keep the synthetic fixture and its SHA-256 unchanged.
2. Distinguish estimated from realized simulated and from observed field outcomes.
3. Keep genuine model responses separate from mocks and deterministic fallback.
4. Preserve negative findings, especially B's additional simulated spoilage.
5. Document shared-storage coupling; simple paired row resampling is descriptive, **not** a causal or population confidence interval.
6. Avoid claiming Gemini performs better across 30 lots until the authentic sequential cohort is completed.
7. Never publish private farmer data, API keys, local trace HMAC keys or local account credentials.

For implementation details see [Architecture](ARCHITECTURE.md) and the [original frozen artifacts](../public/evaluation/manifest.json).
