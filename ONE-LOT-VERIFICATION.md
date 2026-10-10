# One authorized shared-capacity Gemini run

10 October 2026, 18:14:38–18:14:43 UTC. Exactly one new run; no batch or extraction inference.

- Model: `gemini-3.1-flash-lite`, official Google GenAI SDK 2.28.0.
- Lot: `lot_id 5`, displayed Lot 06, potato, West, 4,964 kg; Balanced policy.
- Actual model requests: **2**. Actual successful tools: **5**, all original names. No failures, repeat attempts or fallback.
- Recorded usage: **3,052 input tokens / 148 output tokens**.
- Selected authoritative candidate `market_1:0`: **REROUTE → Market B**, immediate dispatch. Server estimate: gross ₹1,80,242.16 − transport ₹8,752.97 − storage ₹0 = net **₹1,71,489.19**.
- Simulator replay settlement: sold **4,925.033372 kg**, spoiled **38.966628 kg**, unsold **0 kg**; net **₹1,71,489.19**. Synthetic simulation outcomes, not real earnings or demonstrated uplift.
- Run ID: `8d2726c3-59ff-4660-84ff-0a0a42dc9307`.
- Saved trace: ignored `private/evaluation/lot-5.json`. SHA-256: `2e814b0463b19fb1735a5b5eb8bfeb5b03975185ecbc7de64aa8670734191ec9`.
- Fresh-process verification passes: HMAC integrity, exact fixture/context, five request/result receipts, candidate eligibility, deterministic money, reproducible replay. Approval was consumed and archived; new inference is locked again.
- Shared-capacity cohort: **1/30**, no failures/mismatches, full Policy C totals withheld. Original isolated lot_id 1 record remains separate and unchanged. Next chronological cohort lot is `lot_id 25` (displayed Lot 26).

Reproduce saved evidence without inference:

```sh
node --env-file=.env.local --import tsx scripts/cohort.ts
```

Coordinator → Gemini cohort → Verify saved cohort manifest displays the saved cohort. Do not run `--capture-next` without separate approval.

Free-tier/billing-disabled proof passed the existing gate. Fresh supplied quota chart corroborates limits; it is historical peak usage, not an exact live remaining-quota counter. No paid requests were authorized. Remaining 29 runs were not started; no commit, push or deployment.
