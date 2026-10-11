# Repository structure

[← README](../README.md) · [Architecture](ARCHITECTURE.md) · [Setup](LOCAL_DEVELOPMENT.md) · [Evaluation](EVALUATION.md)

This is the **actual repository layout** of the Round 2 Next.js prototype—not a generic template or proposed folder tree. The list highlights representative files instead of every asset and checkpoint document.

```text
AgriRoute-AI/
├── app/
│   ├── page.tsx                    Home
│   ├── demo/page.tsx               Frozen synthetic Demo Lab
│   ├── live/page.tsx               Separate Live Assisted workspace
│   ├── mandi/page.tsx              Synthetic Mandi Lab
│   ├── coordinator/page.tsx        Protected coordinator UI
│   ├── farmer/                     Protected farmer entry and decision
│   └── api/
│       ├── agent/route.ts          Local authorized Gemini / trace API
│       ├── live/route.ts           Weather and road evidence interface
│       ├── mandi/route.ts          Synthetic Mandi data and calculations
│       ├── whatif/route.ts         Controlled scenario sensitivity
│       ├── offers/route.ts         Temporary local buyer-term review
│       ├── session/route.ts        Login / logout / session
│       ├── coordinator/route.ts    Role-restricted workflow / exports
│       └── cohort/route.ts         Cohort status and replay evidence
├── components/
│   ├── Explorer.tsx                Main demo interaction
│   ├── LotMap.tsx                  Interactive synthetic lot map
│   ├── LiveWorkspace.tsx          Live Assisted form and evidence
│   ├── MandiWorkspace.tsx         Synthetic market workspace
│   ├── CoordinatorWorkspace.tsx   Review, planning and approval
│   ├── FarmerDecision.tsx         Restricted Hindi decision
│   └── AgentPanel.tsx             Agent status / recorded trace
├── lib/
│   ├── world.ts                    Typed fixture and geography
│   ├── planner.ts                  Deterministic feasibility and finances
│   ├── simulator.ts                30-day shared-capacity outcomes
│   ├── whatif.ts                   Sensitivity and observed reservations
│   ├── agent.ts                    Tool schema, bounds and tool execution
│   ├── gemini-server.ts            Local model invocation gate
│   ├── agent-store.ts             Local authentic trace store
│   ├── evaluation-capture.ts      Cohort manifests and comparison
│   ├── live.ts                     Live Assisted input and calculations
│   ├── live-providers.ts           Open-Meteo / OSRM receipts
│   ├── mandi.ts                    Synthetic Mandi planner
│   ├── coordinator.ts              Identity, roles and review actions
│   ├── database.ts                 PostgreSQL schema / transactions
│   └── local-api.ts                Local vs hosted origin validation
├── data/
│   ├── world.json                  Frozen seed-42 source dataset
│   ├── world-source.ts             Exact JSON-text fixture representation
│   ├── geography.json              Synthetic independent geography
│   ├── provenance.json             Seed, source and checksum
│   ├── synthetic-mandi.json        Separate seeded Mandi series
│   └── synthetic-mandi.manifest.json
├── public/
│   ├── evaluation/benchmark.json   Frozen A/B evaluation artifact
│   ├── evaluation/manifest.json    Versioned checksums and status
│   └── harvest-landscape.jpg       Locally bundled background image
├── scripts/
│   ├── setup_database.ts           Local PostgreSQL provisioning
│   ├── setup_hosted_database.ts    Guarded one-time hosted bootstrap
│   ├── generate_world.py           Fixture byte-integrity check
│   ├── generate_mandi.ts           Separate Mandi fixture check
│   ├── evaluate.ts                 Frozen A/B comparison
│   ├── cohort.ts                   Replay authentic saved records
│   ├── smoke_http.ts               Local HTTP acceptance
│   └── verify_live.ts              Controlled external-evidence example
├── tests/
│   ├── *.test.ts                    Node unit / integration tests
│   └── browser/*.spec.ts           Playwright browser acceptance
├── docs/                              Reader-facing guides
├── README.md                          Project navigation
├── LICENSE_SCOPE.md                   Exact licensing boundary
├── ACKNOWLEDGEMENTS.md                Third-party notices
├── PLAN.md                            Model assumptions and design
└── VERCEL-NEON-DEPLOYMENT.md          Historical deployment handoff
```

## Ownership of evidence

- **Frozen comparison:** `data/world.json`, `data/provenance.json`, `public/evaluation/*`. Never modify the published benchmark to make new results match.
- **Separate synthetic extension:** `data/synthetic-mandi.json` and its manifest. It is **not** an official mandi feed.
- **Authentication and approvals:** `lib/database.ts` and `lib/coordinator.ts` handle records with tenant/role constraints and human approval.
- **Private authentic evidence:** ignored `private/` directory (not shipped in the repository). Local passwords, HMAC signing key, saved SDK traces, and authorizations must stay there.
- **Browser test artifacts:** `artifacts/browser/` are generated locally and are not production evidence.

## Where to start reading

| If you want to understand... | Read |
| --- | --- |
| Why a route/storage option is eligible | `lib/planner.ts` and `lib/whatif.ts` |
| How A/B policies are evaluated | `lib/simulator.ts` and `scripts/evaluate.ts` |
| Why Gemini cannot invent proceeds | `lib/agent.ts`, `lib/gemini-server.ts` and `lib/agent-store.ts` |
| How approval and farmer views are protected | `lib/coordinator.ts`, `lib/database.ts` and `lib/farmer-record.ts` |
| Why the hosted demo has locks | `lib/local-api.ts` and `app/api/{agent,live,offers}/route.ts` |
| How to reproduce checks | [Local development](LOCAL_DEVELOPMENT.md) and [Evaluation](EVALUATION.md) |

**The documentation reports what code and evidence support.** A complete full-cohort Gemini run, validated live mandi price integration and measured on-farm outcomes are outside the current evidence.
