# Local development and verification

[← README](../README.md) · [Project structure](PROJECT_STRUCTURE.md) · [Architecture](ARCHITECTURE.md) · [Evaluation](EVALUATION.md)

## Requirements

- **Node.js 24** and npm.
- **PostgreSQL** for Coordinator login, tenant/role isolation, lot records and approvals.
- **Playwright Chromium** for browser tests.
- Optional **Python + NumPy** for fixture verification; independent DOCX comparison also requires pandas and the original DOCX, which is not included in the public repository.
- The fresh local PostgreSQL provisioning helper is designed for Apple Silicon macOS with Homebrew tools at `/opt/homebrew/bin`. On other platforms configure an existing PostgreSQL database instead.

## 1. Install dependencies safely

```bash
git clone https://github.com/bug1857/AgriRoute-AI.git
cd AgriRoute-AI
npm ci
```

Create `.env.local` **only if it does not already exist**:

```bash
cp -n .env.example .env.local
```

Local development uses `APP_ORIGIN=http://127.0.0.1:3010` and may leave `GEMINI_API_KEY=` empty. **No Gemini key is required** for the synthetic Demo, Mandi Lab, calculations or regression tests. Never commit secrets.

## 2. Configure PostgreSQL

**Use exactly one option:**

**A. Existing PostgreSQL:** create a dedicated local database and put its connection URI in ignored `.env.local` as `DATABASE_URL`. Ensure the account can initialize the local schema. Do **not** point tests at a hosted/production database.

**B. New Apple Silicon Homebrew PostgreSQL cluster:** leave `DATABASE_URL` absent in `.env.local` and run:

```bash
node --env-file=.env.local --import tsx scripts/setup_database.ts
```

The script initializes a dedicated cluster in ignored `private/postgres` at `127.0.0.1:55432`, applies the application schema and saves local coordinator/farmer credentials in ignored `private/local-accounts.json`. It refuses an existing cluster instead of overwriting it.

> [!CAUTION]
> If `private/postgres` already exists, **restore the saved connection settings** rather than rerunning initialization. Do not delete or reset a working database to make tests pass. The script writes local files and creates accounts; inspect it before use.

For an existing database, `scripts/setup_database.ts` can apply the schema and create local test identities when appropriate. Credentials must remain private.

## 3. Run the app

```bash
npm run dev
```

Visit `http://127.0.0.1:3010`. The main paths are `/demo`, `/mandi`, `/live`, `/coordinator` and `/farmer`. Authenticated pages need database setup and valid local credentials.

To test the production-built local app:

```bash
npm run build
npm run start
```

Keep the server running in its own terminal. **Confirm port 3010 belongs to this project worktree**, not another stale Next.js process, before using browser tests.

## 4. Test and check fixtures

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
python3 scripts/generate_world.py --check
node --import tsx scripts/generate_mandi.ts --check
npm run evaluate:check
```

- `npm run evaluate:check` verifies the immutable benchmark; the environment may also need the **original private authentic trace/HMAC evidence** to reproduce its historical Policy C state exactly. A fresh clone does not include those private files.
- `python3 scripts/generate_world.py --check` needs NumPy compatible with the recorded fixture provenance. The command checks instead of regenerating.
- `scripts/verify_original.py` requires the original external DOCX at a maintainer-specific local path and is **not portable on a clean clone**. Do not infer failure of the published fixture from a missing DOCX.
- Never replace `public/evaluation/benchmark.json` or `public/evaluation/manifest.json` while trying to fix a mismatch.

## 5. Browser acceptance

After setting up the **local** PostgreSQL database and starting the local server:

```bash
npx playwright install chromium
npm run test:browser
```

Playwright's `playwright.config.ts` points to `http://127.0.0.1:3010` and does not automatically start the server. The Coordinator/Farmer browser tests create isolated test identities and database records; **never direct them at Neon production**. Local inference authorization must remain absent/locked for this test suite.

For the HTTP smoke test, with a local server already running:

```bash
npm run test:server
```

## 6. Gemini and provider calls

Do **not** put an API key into a public Vercel deployment. Model invocation is gated by local verification of model availability, free-tier evidence, billing-disabled status, permitted call budget, and an exclusive claim. Authentic local trace replay does not generate new requests.

`scripts/cohort.ts` can inspect saved records in a private maintainer environment. Do not use any capture flags without fresh, purpose-specific approval and independently verified remaining free quota. The currently documented comparable shared cohort remains **1/30**, not a complete AI performance experiment.

For local weather/road evidence, `scripts/verify_live.ts` accesses external Open-Meteo and OSRM services: run only when provider use is justified and their terms are satisfied; routine regression tests do not need live provider calls.

## Troubleshooting

| Symptom | Check first |
| --- | --- |
| `EADDRINUSE` on port 3010 | `lsof -nP -iTCP:3010 -sTCP:LISTEN` and process working directory; do not blindly kill a process |
| Coordinator login not available | `DATABASE_URL`, local PostgreSQL service, provisioning and ignored account file |
| Hosted `/api/live` POST returns 423 | Deliberate serverless evidence-storage restriction; not necessarily an application crash |
| Frozen evaluation mismatch | Exact fixture bytes, private authentic trace availability and historic artifact; do not overwrite the benchmark |
| Playwright workflow unexpectedly differs | Confirm the running server came from the intended worktree/build and uses local test database |

[Deployment-specific instructions →](DEPLOYMENT_AND_LIMITATIONS.md)
