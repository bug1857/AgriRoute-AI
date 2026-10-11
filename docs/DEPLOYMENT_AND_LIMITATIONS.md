# Deployment status and capability boundaries

[← README](../README.md) · [Architecture](ARCHITECTURE.md) · [Local setup](LOCAL_DEVELOPMENT.md) · [Evaluation](EVALUATION.md)

**Public site:** [agri-route-ai.vercel.app](https://agri-route-ai.vercel.app) · **Code:** [main](https://github.com/bug1857/AgriRoute-AI/tree/main)

> [!IMPORTANT]
> **A successful Vercel build is not proof of complete hosted workflow acceptance.** This document describes the implemented safeguards and remaining validation requirements, not certification that all production accounts, database connections and provider features work end to end.

## Local versus hosted features

| Capability | Local setup | Public Vercel behavior |
| --- | --- | --- |
| Home and synthetic Demo Lab | Available | Available; fictional seeded data |
| Synthetic Mandi calculation | Available | Available for properly validated same-origin requests |
| What-if sensitivity | Available | Available subject to API validation |
| Local Live Assisted evidence refresh + snapshot calculation | Available under declared provider/input rules | **HTTP 423** on hosted POST: in-memory evidence cannot safely span serverless instances |
| Anonymous local offer parser/write | Temporary local memory with human review | **HTTP 423** on hosted POST |
| Authenticated Coordinator review, approval, protected farmer projection | Requires local PostgreSQL and authorized users | Designed for Neon PostgreSQL; **requires** secure configuration, account provisioning and hosted acceptance |
| New Gemini inference and private authentic traces | Locally gated, documented evidence only | **Disabled on public hosting**; hosted POST `/api/agent` returns HTTP 423 |

The public `GET /api/live` can expose the Live Assisted location/setup descriptor. That **does not mean** its provider refresh and calculations have been enabled on hosted serverless.

## Production configuration

Vercel builds the Next.js app. The application uses the native `pg` driver for PostgreSQL; no Prisma, Neon Auth or alternate authentication subsystem is required.

The protected production settings are:

| Name | Purpose | Handling |
| --- | --- | --- |
| `APP_ORIGIN` | Exact canonical HTTPS origin (for this project's currently published domain, `https://agri-route-ai.vercel.app`) | No trailing path, query or mismatched host |
| `DATABASE_URL` | Pooled TLS connection string for the dedicated Neon production database | Sensitive secret; never print, paste into issues, commit or attach |
| `GEMINI_API_KEY` | **Not required for public hosting** | Do not enable unreviewed public provider inference |

The production URL and environment must be verified in the **actual Vercel project settings**. A previously reported `APP_ORIGIN` deployment and Neon schema initialization do **not** establish that the current hosted database credential, accounts or user journeys were verified. Do not assume production auth is accepted without running the controlled checks below.

For the one-time database bootstrap, review `scripts/setup_hosted_database.ts` and `lib/database.ts`. Only use protected credentials and exact environment approval, after confirming the intended target database. The script refuses an existing user population rather than overwriting it. Do not bootstrap with local demo passwords or reinitialize a populated database.

## Hosted acceptance checklist

- [ ] Vercel deployment is READY for the intended `main` commit and canonical domain.
- [ ] Exact `APP_ORIGIN` is configured in Production and `GET /api/live` responds with the expected mode descriptor.
- [ ] Neon pooled TLS `DATABASE_URL` is configured confidentially; schemas, user identities and connectivity are confirmed with safe read-only checks.
- [ ] Fresh private Coordinator account can sign in, create/plan a synthetic lot, approve it and view the audit trail.
- [ ] Correctly assigned Farmer can view only the protected approved Hindi projection; unauthorized and cross-tenant access fails.
- [ ] Public synthetic Mandi/what-if calculations work; invalid origin and oversized/invalid inputs are rejected.
- [ ] Hosted `POST /api/live`, public `POST /api/agent` and anonymous `POST /api/offers` continue to refuse unsafe writes as intended.
- [ ] Protected exports, session cookies, error messages and deployment logs reveal no credentials or sensitive traces.
- [ ] Run `npm audit --omit=dev --audit-level=high` and the full `npm audit --audit-level=high` on the released lockfile; resolve reported advisories with reviewed dependency updates, **not** a forced major upgrade without regression.
- [ ] Hosted smoke tests completed separately from local Playwright; no test suite runs against a live production user database.

## Unfinished research and engineering work

1. Durable authenticated Live Assisted evidence storage, provider rate handling and controlled refresh in serverless.
2. Official dated mandi observations and externally verified prices; current Mandi Lab remains synthetic.
3. Genuine, approved, quota-verified completion of the remaining **29/30** Policy C tool-calling decisions before publishing a comparative AI performance result.
4. Separately evaluated Gemini buyer-text extraction with labelled ground truth, consent and a human correction path.
5. Field calibration of spoilage and storage assumptions, and a consent-based pilot before farmer-income or food-waste impact claims.
6. Production-grade backups, monitoring, incident handling, credential rotation, dependency-audit remediation and hosted role isolation checks.

See [`VERCEL-NEON-DEPLOYMENT.md`](../VERCEL-NEON-DEPLOYMENT.md) for the **historical handoff** (written before the GitHub merge), and [GitHub issue #3](https://github.com/bug1857/AgriRoute-AI/issues/3) for recorded follow-up work. Historical instructions such as "do not merge" in that handoff should not be mistaken for the current Git branch state.

## Licence and external services

- Local Live Assisted providers include Open-Meteo and OSRM/OSM route data; car routes are not truck-booking guarantees.
- Hero image, fonts, OpenStreetMap tiles, npm libraries and other external assets retain independent licence and usage conditions.
- See [licence scope](../LICENSE_SCOPE.md) and [third-party acknowledgements](../ACKNOWLEDGEMENTS.md). Do not characterize synthetic records as observed farmer transactions.

**Bottom line:** The project is a working **research prototype with deliberately bounded public hosting**, not a fully validated production marketplace or a completed AI intervention trial.
