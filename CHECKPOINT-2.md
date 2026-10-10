# Checkpoint 2 — genuine agent verified; browser acceptance incomplete

Local production website: http://127.0.0.1:3010/demo. Stop for review. No commits, pushes, deployments, paid integrations or 30-lot Gemini evaluation.

Implemented files:

- `lib/agent.ts`: five original named tool declarations and working handlers; strict lot-bound arguments; six individual invocation cap across parallel/sequential requests; duplicate rejection; model timeout; authoritative candidate-ID selection and deterministic revalidation. SDK conversation preserves original function IDs/signatures. Only successful responses from all five tools permit selection. Model-generated money/extra selection fields are rejected.
- `lib/gemini-server.ts`: official Google GenAI SDK, account model metadata check, fresh Free-tier/billing/quota verification, disabled SDK retries, maximum seven model requests, exclusive persistent live-attempt claim, disk-write preflight and progress journaling before further inference.
- `lib/agent-store.ts` / `lib/agent-types.ts`: versioned records with original inputs, model/SDK version, actual requests/responses, tool arguments/results/timestamps/failures, candidate values, explicit fallback status and dataset/context hashes. Local SHA256/HMAC verification; mocked records rejected from authentic replay. HMAC is local integrity protection, not a Google signature or cloud authentication.
- `app/api/agent/route.ts`: local/same-origin status, replay and explicit-run endpoint; bounded JSON body, strict validation, no key in client responses.
- `components/AgentPanel.tsx`, `components/Explorer.tsx`, `app/globals.css`: cohesive agent/evidence section, real record replay/export and original-input mismatch warning; deterministic recommendation/what-if engine kept intact.
- `tests/agent.test.ts`, `tests/browser/demo.spec.ts`, `playwright.config.ts`, `scripts/smoke_http.ts`, `scripts/verify_gemini.ts`: mocked model and SDK-wire tests, prepared browser checks, server acceptance checks and explicit bounded live verification script.

## Actual Gemini evidence

Official SDK `@google/genai` 2.28.0; model `gemini-3.1-flash-lite`, discovered through the authenticated Google Models API. Function calling and free-tier pricing independently checked against official Google documentation. Free-tier confirmation came directly from the human; supplied AI Studio screenshot showed Set up billing and model limits of 15 RPM, 250K TPM and 500 RPD, with 2 RPD peak usage over the displayed 28-day window. This was peak-usage evidence, not a live remaining-quota counter.

First authorized attempt lost its in-memory trace when writing `private/live-run-verification.json` failed with ENOSPC. Its outcome/tool count remain unknown; no trace or financial result was reconstructed. After the human cleared disk space, the storage probe passed and the human explicitly authorized ONE replacement. Original claim/failure evidence is retained under `private/failed-attempt-1`.

Replacement authentic record: `private/traces/d1f8275c-6075-44a5-8161-032bd6ad065e.json`.

- Start/end: 2026-10-10 12:57:27.166Z / 12:57:35.278Z.
- Status: **success**, two model requests, five individual tools requested and executed, no fallback.
- Inputs: lot ID 1 (displayed Lot 02), Balanced risk, original scenario.
- Actual requested tools: `get_price_forecast(market_1, 5)`; `get_weather(East)`; `check_storage(East, 1202)`; `estimate_spoilage(tomato, 5, 28.45579798105284)`; `transport_cost(East, market_1, 1202)`.
- Selected authoritative candidate: `market_1:0`, **REROUTE → Market B**, no storage. Revalidated eligible; gross ₹47,855.54 minus transport ₹1,309.44 gives **₹46,546.10 estimated net**, 73.7523h usable life at arrival. These are synthetic forecast calculations, not realized income or benefits.
- The spoilage tool's actual 5-day ambient hypothetical returned complete loss; this differs from the selected candidate's 4.778h journey. The raw record preserves that request and result exactly rather than relabelling it as selected-route exposure.
- Recorded response IDs: `NzbKarbsMdmkg8UP_fb7-A8`, `OzbKaqPtG4vn4-EPo8Kw6As`.
- Observed usage: 11,403 input and 152 output tokens across the saved run. Initial lost-attempt usage is unknown.
- Record SHA256: `693e459894c5be54169860fefede9fc7a0d22a0e03563f7d26437399bae04036`. Local HMAC, source/context and current-engine candidate verification pass. Saved record contains no API key.

Current live-attempt allowance is consumed; additional runs require approval. Loading the stored record makes no inference calls and never substitutes changed risk/scenario inputs. Private files and `.env.local` are ignored; key file permissions are 0600.

## Test gates

- `npm test`: **30 passed, zero failed/skipped** (16 agent/storage/policy tests plus 14 original calculator tests). Automated model responses and SDK fetch are mocked, never genuine-success fixtures.
- `npm run lint`: **pass**, no warnings/errors.
- `npx tsc --noEmit`: **pass**.
- `npm run build`: **pass**, landing, demo and agent API routes generated.
- `npm run test:server`: **pass**: all 30 SSR quotes reconcile; local API readiness/authentic replay and selected-candidate consistency; invalid lot, private path/path traversal, cross-origin and oversized-input rejection; repeated live attempts blocked. No inference is made by these checks.
- Runtime dependency audit: **zero vulnerabilities**. The previously reported development lint-chain braces advisory remains; no unsafe force downgrade was performed.
- `npx playwright test --list`: eight tests discovered. **Browser execution NOT RUN** due the prior local-tab security rejection and explicit restriction against alternate-browser bypass.

Map selection, filters, risk/what-if interactions, quote download, navigation, mobile layout and console/hydration acceptance remain unverified in a browser. The new agent panel/replay/download also remains browser-unverified. `BROWSER-CHECKS.md` provides the short manual checklist. No new browser screenshot is claimed.

## Next task

First restore browser access and execute the prepared interaction tests, fixing/retesting any failures. Then, after checkpoint review, implement the original shared-capacity 30-day simulator and reproducible nearest-market baseline versus deterministic planner evaluation. Expand genuine default-risk Gemini evaluation only under separately approved free quota, keeping agent, failure and fallback outcomes distinct. No new UI features or integrations are part of this checkpoint.

Official references: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite ; https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/docs/rate-limits .
