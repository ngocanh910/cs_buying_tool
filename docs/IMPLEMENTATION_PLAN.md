# CSGOEmpire Bot Implementation Plan

## Milestone 0 - Documentation Audit And Contract Registry

**Deliverables**
- Repository audit, project scope, conflict log, and external contract registry.
- Quality-gate tooling plan for lint, format, typecheck, test, build, and simulator.

**Dependencies**
- Existing docs in `docs/`.
- No real Empire or Steam credentials.

**Tests**
- Documentation review only.
- Tooling smoke checks once scaffold exists.

**Exit Criteria**
- All required docs are found and reviewed.
- Every Empire and Steam contract remains `UNVERIFIED_EXTERNAL_CONTRACT` until evidence, fixtures, schemas, and contract tests exist.
- Default mode is simulation plus dry-run.

**Risks**
- Existing docs disagree on conflict precedence. This session follows direct user instructions and `09_AGENTS.md`; the conflict is recorded in `docs/10_DECISIONS.md`.

## Milestone 1 - Domain Core, Simulator, And Foundation Tests

**Deliverables**
- Strict TypeScript pnpm workspace.
- Domain value objects, config models, pure sniping/bidding/trade verification rules.
- Worker, auction watcher, and purchase/trade state machines.
- External gateway/repository/clock/id/event interfaces plus in-memory/fake/simulator implementations.
- Deterministic simulator scenarios for buy, bid, reconnect, timeout, stale/duplicate/out-of-order, kill switch, and trade verification.
- Unit tests for safety invariants.

**Dependencies**
- Milestone 0 quality gates.
- Zod runtime validation for config and external-shaped snapshots.

**Tests**
- Unit tests for value objects, decisions, trade verification, deduplication, and invalid transitions.
- Simulator smoke test using deterministic fixtures.

**Exit Criteria**
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm simulator` pass.
- Domain code has no direct HTTP, WebSocket, database, or UI dependency.
- Live trading remains disabled.

**Risks**
- Without verified external fixtures, simulator field names are internal test contracts only.

## Milestone 2 - Persistence And Worker Lifecycle

**Deliverables**
- PostgreSQL migrations and durable records for accounts, commands, auctions, purchases, and redacted events.
- Worker lifecycle orchestration with restart-safe reconstruction.
- Redis abstraction for cache/coordination only.

**Dependencies**
- Stable domain states and repository interfaces.
- Local Docker Compose PostgreSQL and Redis.

**Tests**
- Integration tests for migrations, repository behavior, restart recovery, and command durability.

**Exit Criteria**
- Unknown command outcomes are persisted and reconciled, not blindly retried.
- One serialized transaction command queue per account exists.

**Risks**
- Schema may need revisions after verified external contracts expose real identifiers and event versions.

**Current progress**
- Added initial `schema_migrations` tracking table to the first migration.
- Added a dependency-free migration runner abstraction so a future PostgreSQL driver can execute and record migrations.
- Added in-memory command repository behavior for durable-before-send semantics, duplicate command rejection, and unknown-outcome reconciliation queues.
- Added worker runtime reconstruction that forces dry-run paused state after unclean shutdown or pending reconciliation.
- Added command reconciliation evidence fields (`unknown_reason`, `updated_at`) to the initial schema.
- Added an atomic migration runner hook via `SqlExecutor.runInTransaction`.
- Added a narrow cache/coordination contract for future Redis-backed leases without requiring Redis in Milestone 2.
- Worker reconstruction now keeps live trading disabled unless verified external contracts are explicitly enabled.
- PostgreSQL driver-backed repositories are intentionally deferred until dependency approval.

## Milestone 3 - Dry-Run Adapters

**Deliverables**
- Read-only adapter skeletons for verified contracts only.
- Runtime schemas, redaction, timeout/cancellation handling, and contract test harnesses.
- Dry-run decision engine that records proposed commands without sending them.

**Dependencies**
- Verified read-only contract evidence and redacted fixtures.
- Persistence from Milestone 2.

**Tests**
- Contract tests per verified fixture version.
- Replay tests for duplicates, out-of-order events, stale data, and disconnect/reconnect.

**Exit Criteria**
- Proposed buy/bid/accept commands are visible and auditable but never sent.
- No unverified endpoint or payload appears in executable live adapter code.

**Risks**
- Platform rate limits and auth flows may force scope reduction.

**Current progress**
- Added runtime Zod schemas for internal raw market item and reference price snapshots before conversion into domain value objects.
- Added a verified-contract guard so executable live/read-only adapters can fail closed while contracts remain unverified.
- Added a worker dry-run decision engine for fixed-price sniping that records proposed buy commands without calling `buyItem`.
- Added a worker dry-run decision engine for auction bidding that records proposed bid commands without calling `placeBid`.
- Proposed dry-run commands are persisted with `dryRun: true` and `status: "proposed"` for audit/review.
- Read-only Empire/Steam adapters remain intentionally deferred because all external contracts are still `UNVERIFIED_EXTERNAL_CONTRACT`.

## Milestone 4 - Dashboard And Control Plane

**Deliverables**
- API/control plane for configuration, worker status, kill switch, dry-run decisions, and audit history.
- Minimal dashboard for safe operations.

**Dependencies**
- Worker lifecycle and persisted event/command state.
- Authz design and secret masking.

**Tests**
- API tests for authz, config validation, kill switch behavior, and redaction.
- E2E dry-run flow from dashboard config to decision history.

**Exit Criteria**
- Operators can pause accounts and enable global kill switch.
- UI never displays plaintext secrets.

**Risks**
- Dashboard must avoid presenting estimated P&L as realized profit.

**Current progress**
- Added a Fastify control-plane surface for runtime status, global kill switch, per-account pause, and redacted command audit history.
- Added request validation for kill switch and pause updates.
- Added fail-closed bearer-token protection for `/control/*` routes via `CONTROL_PLANE_TOKEN`; no token value is returned by the API.
- Added a shared control-plane store abstraction so API kill switch and per-account pause state can be consumed by worker orchestration.
- Added bounded command audit listing through the command repository abstraction.
- Added a static dashboard placeholder for safe local operations only.
- Production dashboard, durable authz, and real operator identity management remain deferred.

## Milestone 5 - Verified External Integration

**Deliverables**
- Verified read paths for identity, balance, fixed-price items, auctions, reference prices, and Steam offer discovery.
- Contract registry updates with evidence, fixtures, schemas, and tests.

**Dependencies**
- Authorized documentation or redacted captures.
- Legal/ToS approval for allowed integration behavior.

**Tests**
- Contract, replay, rate-limit, timeout, and redaction tests.

**Exit Criteria**
- All used external contracts are marked verified with supporting tests.
- Transaction methods remain disabled unless separately verified and flagged.

**Risks**
- If permitted integration cannot be established, live transaction work stops.

**Current progress**
- Added a pure contract verification harness in `packages/contracts` for future Empire/Steam integrations.
- Contract evaluation remains fail-closed unless evidence, redacted fixtures, runtime schema name, contract test name, and documented auth/rate-limit/timeout/idempotency/error behavior are all present.
- Added tests that reject incomplete metadata and fixtures that are not redacted or may contain secrets.
- No Empire or Steam external contract is marked verified because authorized documentation or redacted captures are not present in the repository.
- No live or read-only adapter was implemented in this milestone.

## Milestone 6 - Low-Value Live Validation

**Deliverables**
- Live command validation gate that fails closed unless explicit live flags, dry-run state, verified transaction contracts, kill switch, account pause, and value caps all allow the command.
- Per-command, per-account daily, and global daily low-value caps represented with `CoinAmount`.
- No live transaction method is enabled in this repository until at least one transaction contract is verified and operational approval exists.

**Dependencies**
- Verified transaction contract and operational approval.
- Durable command record before send.

**Tests**
- Gate tests for disabled live mode, dry-run mode, unverified contracts, kill switch, account pause, per-command cap, per-account daily cap, global daily cap, and the all-clear allow path.
- Command persistence before send, unknown outcome reconciliation, and no blind retry remain required before any live sender can be enabled.

**Exit Criteria**
- Current safe-scope exit: live validation gate exists and is tested, while real network send remains impossible.
- Future live exit: successful low-value validation with complete audit trail and no safety-rule weakening.

**Risks**
- Steam confirmation/session behavior may require manual review flow instead of automated acceptance.
- No Empire or Steam transaction contract is verified yet, so Milestone 6 cannot truthfully enable a live buy, bid, or trade accept path.

## Milestone 7 - Production Hardening

**Deliverables**
- Multi-account isolation, backpressure, alerts, metrics, backup/restore, load tests, chaos tests, and release checklist.
- Current safe-scope deliverable: pure production preflight gate that reports missing release requirements without enabling production or live sends.

**Dependencies**
- Verified integrations and validated low-value operation.

**Tests**
- Load tests with at least 20 simulated accounts.
- Chaos tests for worker crash, Redis/PostgreSQL transient failures, WSS churn, and restart recovery.
- Security tests for redaction, authz, secret scanning, and malicious inputs.
- Preflight tests for production env, explicit live mode, live flag, verified transaction contracts, value caps, dry-run replay review, load-test count, chaos tests, backup/restore, alerts, secret scan, and legal approval.

**Exit Criteria**
- Runbook release checklist passes.
- Production mode requires explicit configuration, verified contracts, and value caps.

**Risks**
- External platform policy changes can invalidate live operations and require immediate transaction shutdown.
- Current repo cannot pass production release readiness because no Empire or Steam transaction contract is verified.

**Current progress**
- Added a pure worker-side production preflight gate.
- The preflight gate accumulates every blocking issue instead of failing at the first missing requirement.
- No production mode, live sender, external API, dashboard alert integration, backup implementation, or real load/chaos infrastructure was added.

## Milestone 8 - Release Evidence And Audit Report

**Deliverables**
- Pure release evidence report that summarizes production preflight, quality gates, safety scans, and external contract posture.
- Machine-readable blockers explaining why a release is ready or blocked.
- No deployment, live trading, network calls, or shell command execution.

**Dependencies**
- Production preflight decision from Milestone 7.
- Quality gate and safety scan results supplied by the caller.

**Tests**
- Report blocks when preflight is blocked.
- Report blocks when a quality gate fails.
- Report blocks when a safety scan fails.
- Report is ready only when preflight, quality gates, safety scans, and external contracts all pass.

**Exit Criteria**
- Evidence report is deterministic and pure.
- Current repo remains blocked while external transaction contracts are unverified.

**Risks**
- Evidence inputs can be falsified by a caller until a later CI system records signed/immutable results.

**Current progress**
- Added a worker-side release evidence report builder.
- The report never executes checks itself; it only summarizes explicit inputs.
- No production deployment automation or live integration was added.

## Post-Milestone 8 Roadmap

Detailed specifications for the remaining roadmap live in `docs/POST_M8_MILESTONE_SPEC.md`.

## Milestone 9 - Documentation Reconciliation And Readiness Matrix

**Deliverables**
- Canonical readiness matrix for simulation, dry-run, verified read-only, low-value live, and production.
- Milestone-numbering reconciliation between `docs/02_CODEX_MASTER_PROMPT.md` and this implementation plan.
- Current-state checklist showing completed, partial, blocked, and explicitly out-of-scope capabilities.
- Live-readiness blockers list.

**Dependencies**
- Existing docs only.
- No external data and no real credentials.

**Tests**
- Documentation scan for unresolved placeholder language, accidental endpoint URLs, and conflict markers.

**Exit Criteria**
- A new agent can tell which capabilities are safe to run locally and which remain blocked.
- Documentation explicitly says the repository is not live-operational.
- No external contract status is upgraded.

**Risks**
- Over-editing historical milestone language could make prior ADRs harder to understand.

**Current progress**
- This section is the canonical Milestone 9 reconciliation point.
- `docs/POST_M8_MILESTONE_SPEC.md` contains detailed future milestone specs.
- Live trading remains disabled and all Empire/Steam contracts remain unverified.

### Canonical Readiness Matrix

| Readiness Level | Meaning | Current Status | Evidence In Repo | Required To Advance |
|---|---|---|---|---|
| Simulation | Deterministic local fixtures and simulator only | Available | Domain tests, simulator scenarios, `pnpm simulator` | Keep deterministic replay green |
| Dry-run | Proposed commands can be recorded without external send | Partial | Dry-run worker engine, proposed command records, control-plane skeleton | Durable PostgreSQL repositories, full dashboard flow, config revisioning |
| Verified read-only | External reads only from verified contracts | Blocked | Contract registry and verification harness | Authorized evidence, redacted fixtures, runtime schemas, contract tests |
| Low-value live | One verified transaction method under strict caps | Blocked | Live validation gate only | Verified transaction contract, durable command before send, reconciliation, operator approval |
| Production | Multi-account live operation with ops controls | Blocked | Production preflight and release evidence gates | Verified integrations, load/chaos, alerts, backup/restore, legal approval |

### Milestone Numbering Reconciliation

`docs/02_CODEX_MASTER_PROMPT.md` defines an original high-level Milestone 0-6 sequence. This implementation plan split that sequence into smaller safe-scope milestones after repeated review gates. The mapping below is canonical for future sessions.

| Master Prompt Milestone | Original Meaning | Implementation Plan Milestones | Notes |
|---|---|---|---|
| 0 | Repository and quality gates | 0 | Same intent |
| 1 | Domain and simulator | 1 | Same intent |
| 2 | Read-only adapters | 3, 5, 11, 12 | Split because all external contracts remain unverified |
| 3 | Decision engine and dry-run | 3, 4, 13 | Dry-run engine exists; dashboard E2E remains future work |
| 4 | Controlled transaction adapters | 6, 14 | Only validation gates exist; no live sender exists |
| 5 | Trade Offer flow | 1, 14 | Pure trade verification exists; Steam discovery/accept remains blocked |
| 6 | Multi-account hardening | 2, 7, 8, 15 | Lifecycle/preflight/evidence exist; full ops hardening remains future work |

### Current-State Checklist

| Capability | Status | Notes |
|---|---|---|
| Strict TypeScript workspace | Complete | Quality gates are available |
| Domain value objects and core decisions | Complete | Pure domain rules are tested |
| State machines and invalid transition tests | Complete | Framework-independent |
| Deterministic simulator | Complete | Local replay only |
| External interface boundaries | Complete | Interfaces exist; live adapters blocked |
| Runtime validation for internal raw snapshots | Partial | Internal schemas exist; external schemas await verified contracts |
| Dry-run proposed buy/bid recording | Partial | In-memory/test-oriented repositories still limit durability |
| PostgreSQL persistence | Partial | Migration abstraction exists; driver-backed repositories are future work |
| Redis coordination | Partial | Interface exists; Redis-backed implementation is future work |
| Control-plane API | Partial | Local skeleton exists; durable authz/operator identity remains future work |
| Dashboard | Partial | Static safety placeholder only |
| Contract verification harness | Complete | Harness exists; no real contract is verified |
| Read-only Empire/Steam integration | Blocked | Requires verified external contracts |
| Live buy/bid/Trade Offer accept | Blocked | Requires verified transaction contracts and operational gates |
| Production readiness | Blocked | Requires Milestone 15 evidence |

### Live-Readiness Blockers

- All Empire and Steam contracts in `docs/04_EXTERNAL_CONTRACTS.md` remain `UNVERIFIED`.
- No authorized external fixtures, runtime schemas, or contract tests exist for real Empire/Steam traffic.
- No PostgreSQL driver-backed repositories exist for durable production state.
- No envelope encryption implementation exists for real secrets.
- Dashboard is not a production operator UI.
- No verified read-only adapters exist.
- No verified transaction adapter exists.
- No load test, chaos test, backup/restore, alerts, metrics, or immutable CI release evidence exists.

The remaining post-Milestone 9 milestones are:

- Milestone 10 - Real Persistence And Secret Safety.
- Milestone 11 - Verified Read-Only Contract Intake.
- Milestone 12 - Read-Only Adapters.
- Milestone 13 - Dry-Run E2E Dashboard.
- Milestone 14 - Controlled Transaction Proof Of Concept.
- Milestone 15 - Production Operations Hardening.

These milestones do not authorize live trading by default. They keep Empire and Steam integrations blocked until the relevant contracts are verified in `docs/04_EXTERNAL_CONTRACTS.md`.

## Milestone 10 - Real Persistence And Secret Safety

**Deliverables**
- Driver-agnostic SQL command repository seam for durable command persistence and reconciliation.
- Envelope encryption interface plus local development AES-256-GCM implementation.
- Recursive secret redaction helper for JSON-like evidence and payloads.
- Environment validation for optional local encryption keys.
- Documentation of the remaining PostgreSQL driver and integration-test gap.

**Dependencies**
- Existing migration abstraction and command repository contract.
- No new database package has been added; a real PostgreSQL driver still requires dependency approval.
- `DATABASE_URL` remains optional for simulation defaults.
- `LOCAL_ENCRYPTION_KEY` is optional by default and must be a 32-byte string when configured.

**Tests**
- Secret redaction tests.
- Local envelope encryption tests.
- SQL command repository seam tests with a fake SQL client.
- Environment validation tests for local encryption key handling.

**Exit Criteria**
- Current safe-scope exit: command persistence can be exercised through a SQL client interface without adding a database dependency.
- Current safe-scope exit: plaintext secrets can be redacted before persistence and encrypted with a local non-production key when configured.
- Future full exit: PostgreSQL driver-backed account, command, auction, purchase, and redacted-event repositories pass integration tests against local PostgreSQL.

**Risks**
- A real PostgreSQL client may expose driver-specific transaction and serialization behavior that the fake SQL client cannot prove.
- Encryption key rotation still needs a separate ADR before production secret storage.

**Current progress**
- Added `SqlClient` and `SqlCommandRepository` in `packages/persistence`.
- `SqlCommandRepository.persist` and `persistProposed` run inside a transaction and write proposed/persisted command rows before any send-capable state can exist.
- Unknown command outcomes can be marked and queried for reconciliation through the SQL seam.
- Added `redactSecrets` for nested JSON-like evidence.
- Added `createLocalEnvelopeEncryption` using Node AES-256-GCM and a 32-byte local development key.
- Added `LOCAL_ENCRYPTION_KEY` validation in config and `.env.example`.
- PostgreSQL driver-backed repositories for accounts, auctions, purchases, and redacted events remain future work pending dependency approval and local integration setup.

## Milestone 11 - Verified Read-Only Contract Intake

**Deliverables**
- Contract intake template for future official documentation or authorized redacted captures.
- Redacted fixture directory policy and naming convention.
- Pure contract intake evaluator for read-only candidates.
- Negative tests proving transaction-scope, unapproved evidence, non-local references, unsafe fixture paths, and secret-bearing fixtures remain blocked.
- Documentation that no current Empire or Steam contract is verified.

**Dependencies**
- Existing contract verification harness.
- Authorized external evidence is still absent from the repository.
- No live credentials and no real captures.

**Tests**
- Intake evaluator tests for accepted read-only candidate metadata.
- Intake evaluator tests for transaction-scope rejection.
- Intake evaluator tests for unapproved evidence, non-docs-local references, invalid fixture paths, and secret-bearing fixtures.

**Exit Criteria**
- Current safe-scope exit: future evidence has a documented intake process and a pure acceptance gate.
- Current safe-scope exit: no contract is upgraded to `VERIFIED`.
- Future full exit: at least one read-only contract can be verified only after authorized evidence, redacted fixtures, runtime schemas, and contract tests exist.

**Risks**
- Authorized captures may require stricter redaction than the current metadata gate can prove.
- External platform policy may still block read-only integration even if fixture intake is technically complete.

**Current progress**
- Added `evaluateContractIntake` in `packages/contracts`.
- Added `docs/contracts/CONTRACT_INTAKE_TEMPLATE.md`.
- Added `docs/contracts/fixtures/README.md`.
- No real Empire or Steam fixture was added.
- All external contracts remain `UNVERIFIED`.

## Initial Audit

- Repository status: documentation-only project, not currently a Git repository.
- Found required docs: `02_CODEX_MASTER_PROMPT.md`, `09_AGENTS.md`, `03_PRODUCT_AND_TECH_SPEC.md`, `04_EXTERNAL_CONTRACTS.md`, `05_DOMAIN_AND_STATE_MACHINES.md`, `06_SECURITY_AND_SAFETY.md`, `07_TEST_PLAN.md`, `08_RUNBOOK.md`, and `10_DECISIONS.md`.
- Unclear/unverified: all Empire and Steam endpoints, auth flows, payloads, WebSocket channels, event names, idempotency behavior, rate limits, timeout semantics, Steam partner identity source, and Trade Offer confirmation flow.
- Decisions that can be made now: strict TypeScript monorepo, pnpm workspace, Fastify-ready API package placeholder, Zod validation, Vitest, ESLint, Prettier, Docker Compose for local PostgreSQL/Redis, pure framework-independent domain package, simulator/dry-run default.
- Decisions waiting for PoC or verified data: live Empire and Steam adapter implementation, external field mappings, official rate limits, buy/bid retry safety, Steam offer acceptance automation, identity resolution, and production dashboard workflows.
