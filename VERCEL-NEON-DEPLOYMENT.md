# Vercel + Neon deployment handoff

Current state: deployment-preparation patch only. **Do not merge or publish until tests pass and the exact production URL is known.**

## Scope and safety

- Next.js site runs on Vercel; the existing `pg` driver talks to Neon PostgreSQL.
- Existing server-side coordinator sessions, tenant isolation, immutable approvals and authorized Hindi Farmer View use Neon after schema/bootstrap.
- Production `APP_ORIGIN` is the exact Vercel HTTPS origin, without trailing slash, paths or query.
- Public synthetic `/api/mandi` and `/api/whatif` are enabled for exact same-origin POSTs. They remain synthetic and do not trigger Gemini.
- Public Gemini `/api/agent` inference and private trace export are **locked**, irrespective of forged localhost Host values.
- Hosted anonymous /api/offers POST and Live Assisted provider refresh/recalculate are **temporarily blocked** (HTTP 423), since their old Map-based state cannot reliably survive serverless instances. The authenticated coordinator offer-review workflow is PostgreSQL-backed. Do not claim full hosted parity for Live Assisted.
- No private trace files, real local accounts, Gemini keys or existing local PostgreSQL data are included.

## 1. Verify this branch locally (before merge)

```sh
git fetch origin
git switch deploy/vercel-neon-readiness
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run evaluate:check
```

Run existing Playwright acceptance tests with your normal local PostgreSQL and test-server setup. Inspect `tests/deployment.test.ts` and confirm production-origin test pass. Never run live Gemini capture.

## 2. Neon

- Neon project: `agriroute-ai`, branch `production`, database `neondb`, Singapore region.
- Copy its **pooled** TLS connection URI privately. Do not share it in issues, logs, chat, CI output or Git.
- Database is initially empty: provision the application's original PostgreSQL schema and *one fresh private coordinator account*, not the old local demo accounts.

Use `scripts/setup_hosted_database.ts` only after reviewing its SQL schema (`lib/database.ts`), on the correct empty Neon database and with private one-time settings. Create local ignored file `.env.hosted.local` containing:

```dotenv
DATABASE_URL=postgresql://...POOLED_NEON_CONNECTION...
APP_ORIGIN=https://YOUR-EXACT-VERCEL-PRODUCTION-DOMAIN
AGRIROUTE_HOSTED_SETUP=I_UNDERSTAND
AGRIROUTE_ADMIN_EMAIL=YOUR_PRIVATE_COORDINATOR_EMAIL
AGRIROUTE_ADMIN_PASSWORD=YOUR_NEW_UNIQUE_STRONG_PASSWORD
```

The password should be unique, randomly generated, 16+ characters and not the local test password. Don't reuse credentials from the old local `private/local-accounts.json`.

Then from the project directory:

```sh
node --env-file=.env.hosted.local --import tsx scripts/setup_hosted_database.ts
```

This performs the existing schema migration and seeds only the specified coordinator identity. It refuses missing approval settings and refuses to seed if any users already exist. Do not run it against your old local database. Farmer identities must be provisioned through a separately reviewed, authorized process; the existing script does not create a shared/public farmer account.

Afterwards verify tables and users in the Neon console with safe read-only queries and ensure no secrets were copied into Git. Treat database backups, account rotation, migrations and incident response as production responsibilities.

## 3. Vercel

Import `bug1857/AgriRoute-AI`, framework Next.js, root `./`, default build/install commands.

Choose the **correct Vercel production URL** after project creation; do not guess it.

Production secrets in Vercel Project > Settings > Environment Variables:

- `DATABASE_URL`: Neon pooled TLS URI (**sensitive**).
- `APP_ORIGIN`: the exact canonical `https://...` production domain.
- **Do not add `GEMINI_API_KEY`** for public hosting. The cohort/provider authorization files stay local-only.
- Do not add Neon Auth, Prisma or another authentication implementation.

Avoid publishing the website until this branch is reviewed, tests pass, and a protected preview environment validates the authenticated workflow.

## 4. Hosted smoke and limitations

Once preview/production config is ready, verify:

1. `/`, `/demo`, `/mandi`, `/coordinator` and navbar/mobile tabs.
2. `/api/mandi` and `/api/whatif` with proper Origin and bounded synthetic inputs.
3. Authenticated coordinator sign-in -> create lot -> plan -> approve -> refresh -> view approved snapshot; same-tenant/role restrictions and private exports.
4. `/farmer` assignment and Hindi decision with a separately provisioned farmer identity; no public access to another tenant's decisions.
5. Cross-origin POST blocked, tampered session denied, secure cookies on HTTPS, no secret output in deployment logs.
6. Hosted Gemini button disabled and no provider calls. Policy C remains incomplete. Old authentic traces are not hosted.
7. Anonymous buyer offers and Live Assisted evidence refresh explicitly show their disabled hosted state; **not full feature parity**.

A failed test keeps production status BLOCKED. A successful build alone is not deployment acceptance. Round 2 PDF must not imply unverified live operations or actual farmer earnings.

## Rollout

Do not force-push. Merge only after manual review and checks. Then configure Vercel/Neon, deploy and inspect logs. Keep the frozen A/B simulation, synthetic-only F14, licence notices and canonical data intact.
