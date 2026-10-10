# Checkpoint 1 — implementation and evidence

Review checkpoint; no further milestone work started. Local production server: http://127.0.0.1:3010.

Implemented: new Next.js website, original seed-42 fixture generator and independent DOCX comparator, shared deterministic SELL NOW / STORE / REROUTE calculator, 48h / 24h / 0h risk eligibility, premium landing and map-led lot explorer, crop/region filtering, calculated financial breakdown, deterministic what-if controls and quote JSON export. All world data and transport/spoilage assumptions are labelled synthetic. No agent results or realized financial benefits are claimed.

Verified on 10 October 2026:

- 14 automated tests pass: independent hand calculations, mass and money reconciliation, all-lot evaluation, expiry/horizon/capacity constraints, risk monotonicity and boundaries, forecast leakage, scenario effects and malformed inputs.
- Original DOCX code and fixture arrays match exactly: 30 lots, 600 price observations, 480 weather observations and four stores. Total harvest: 97,509 kg. Fixture SHA256: `a6df67a925f9e4de968c9baa455bcad67baa47e46b1fffca210c7d6c07961659`.
- ESLint and TypeScript complete with no errors or warnings. Production build succeeds.
- Production HTTP smoke check passes: landing, all 30 server-rendered lot quotes reconciled against the calculator, invalid lot fallback and 404. These are server checks, not interactive browser tests.
- Runtime dependency audit: zero vulnerabilities. The development lint toolchain has a reported braces denial-of-service advisory with no available patched upstream version at this checkpoint.
- Landing page actually rendered in the browser; screenshot: `artifacts/checkpoint-1/landing-desktop.jpg`.

Browser acceptance is incomplete. The browser security policy rejected subsequent access to the local tab. Map interactions, hydration, risk/what-if controls, download capture and mobile rendering have not been browser-verified; no alternate browser surface was used to bypass that block.

Next coding task, after review: server-side Gemini function calling through the five original named tools, six-call enforcement and genuine saved tool-call evidence; verify one end-to-end run before broader evaluation. Requires a Gemini key and an authorized quota/cost policy. The shared-capacity 30-day simulator, measured three-policy evaluation and live integrations remain later checkpoints.

No commits, pushes, deployments, paid API calls or changes to old repositories.
