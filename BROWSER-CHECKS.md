# Browser acceptance — BLOCKED / NOT RUN

The browser security policy previously rejected the local tab and expressly prohibited bypass via an alternate browser surface. Project-owned Playwright tests are prepared but were not executed to evade that restriction. Server HTTP tests do not prove hydration or interactions. After browser access is restored, run `npm run test:browser` against the running local site; Chromium must be available to Playwright.

Manual review at http://127.0.0.1:3010/demo:

1. Click a numbered map marker; the same lot must become highlighted in the list and decision heading.
2. Select Tomato and a region; only matching lots remain. A combination without lots must show an empty state.
3. Move risk through Conservative / Balanced / Adventurous; compare eligible-option counts and 48h / 24h / 0h policy. Hard failures stay excluded.
4. Change price, rain delay and storage cost; estimated net/life/eligibility must recalculate. Reset restores default values.
5. Export quote; compare its lot, risk, scenario, recommendation and paise values with the current calculation. It must identify a synthetic deterministic quote, not Gemini or realized benefits.
6. Navigate Home → Demo Lab → Our approach → Demo. Confirm no dead navigation.
7. Review at 390 × 844 and desktop widths: no horizontal overflow, clipped text or inaccessible controls.
8. Check the browser console for runtime/hydration errors. Map markers should remain usable if basemap tiles are unavailable.
9. Select the Gemini sub-tab beside Decision, then open the existing authentic Gemini record's tools and provenance, export the trace, then change risk/lot/scenario. The trace must retain original inputs and say historical replay when mismatched. The run button stays disabled; replay consumes no inference quota. The frozen evaluation below must show the downloaded A/B totals, negative kg saved and Policy C INCOMPLETE, regardless of Explorer control changes.

All checks remain unverified until browser evidence is recorded. Eight automated tests are prepared; the eighth now includes authentic replay, trace export, input mismatch, inference lock and frozen evaluation values. Listing tests only discovers them; it does not execute them. Server-rendered values and HTTP replay/download integrity are verified separately.

## LIVE_ASSISTED manual acceptance (also UNVERIFIED)

At http://127.0.0.1:3010/live:

- Navigate from Demo Lab using the Live assisted link. Tab through labelled inputs, details and buttons; focus must remain visible. Check at 390×844 and desktop for overflow.
- Switch Lot / Locations / Prices / Transport & storage beside the Decisions / Evidence & routes tabs. Values must survive switching, keyboard arrows/Home/End must move tab focus, and revealing Evidence & routes must resize the actual road map correctly.
- Enter a variety, dispatch within three days, reviewed manual prices with sources/dates/expiry, and explicit carrier/storage terms. Default coordinates are city/road/locality locators; do not confirm them as farm/market gates without replacing/reviewing them.
- Fetch evidence: loading disables repeat fetch. Receipts must show actual forecast/road retrieval times and geometry. Mandi remains deferred, with no official-price claims. Missing/failed providers must remain UNAVAILABLE.
- Compare each candidate's money/weight/timing with Export evidence JSON (`result.candidates`). Change risk/price/hold duration, then Recalculate: actual eligibility/money must change using the same receipt timestamps. Changed coordinates must require refresh.
- Remove manual-price review, reduce confirmed carrier/storage capacity, or expire quotes: affected candidates must be excluded. Unknown availability must remain CONDITIONAL. No booking or guaranteed earnings.
- Save/restore only on this device; restored inputs require new evidence. Expired/malformed saved records must report an error without crashing. Check console/runtime errors and error/status announcements. API HTTP/calculator verification does not prove these browser checks.

## Synthetic mandi and buyer offers (UNVERIFIED in browser)

At http://127.0.0.1:3010/mandi:

- Confirm the synthetic label stays visible. Change crop, simulation date, market and history window; table/chart must match `/api/mandi` and never claim official/live prices. Download JSON must match the published SHA-256.
- Switch peer tabs with pointer and keyboard, including Buyer offers. Change risk, rain, price shock, storage cost/capacity and usable life; displayed candidates must match server values. Invalid input must announce an error and never relabel an old result as current.
- Paste Hindi/English/Hinglish messages; extracted terms must retain exact quoted evidence. Missing/ambiguous terms require correction. Nothing affects the planner before acknowledgement and Confirm. A reviewed 500kg tomato offer at ₹35/kg to Chomu gives estimated net ₹16,209.82 with the default Oct 10 assumptions; this is synthetic conditional planning, not realized earnings.
- Start manual entry, correct terms and confirm. Reject/withdraw must remove the offer and return to generated-price planning. Change crop/weight/destination with an attached offer: mismatch must produce an error. Edit the original message: the review must retain its original evidence and ask for re-extraction.
- Review 390×844 and desktop widths, focus order, loading/status errors and console/hydration. These checks remain NOT RUN; HTTP success is not browser proof.
