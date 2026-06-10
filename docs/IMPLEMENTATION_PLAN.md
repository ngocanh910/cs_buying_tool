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

## Milestone 6 - Low-Value Live Validation

**Deliverables**
- One transaction method enabled at a time behind explicit feature flags.
- Per-account/global value caps and reconciliation workflow.
- Low-value test account validation.

**Dependencies**
- Verified transaction contract and operational approval.
- Durable command record before send.

**Tests**
- Command persistence before send, unknown outcome reconciliation, no blind retry, and value cap tests.

**Exit Criteria**
- Successful low-value validation with complete audit trail and no safety-rule weakening.

**Risks**
- Steam confirmation/session behavior may require manual review flow instead of automated acceptance.

## Milestone 7 - Production Hardening

**Deliverables**
- Multi-account isolation, backpressure, alerts, metrics, backup/restore, load tests, chaos tests, and release checklist.

**Dependencies**
- Verified integrations and validated low-value operation.

**Tests**
- Load tests with at least 20 simulated accounts.
- Chaos tests for worker crash, Redis/PostgreSQL transient failures, WSS churn, and restart recovery.
- Security tests for redaction, authz, secret scanning, and malicious inputs.

**Exit Criteria**
- Runbook release checklist passes.
- Production mode requires explicit configuration, verified contracts, and value caps.

**Risks**
- External platform policy changes can invalidate live operations and require immediate transaction shutdown.

## Initial Audit

- Repository status: documentation-only project, not currently a Git repository.
- Found required docs: `02_CODEX_MASTER_PROMPT.md`, `09_AGENTS.md`, `03_PRODUCT_AND_TECH_SPEC.md`, `04_EXTERNAL_CONTRACTS.md`, `05_DOMAIN_AND_STATE_MACHINES.md`, `06_SECURITY_AND_SAFETY.md`, `07_TEST_PLAN.md`, `08_RUNBOOK.md`, and `10_DECISIONS.md`.
- Unclear/unverified: all Empire and Steam endpoints, auth flows, payloads, WebSocket channels, event names, idempotency behavior, rate limits, timeout semantics, Steam partner identity source, and Trade Offer confirmation flow.
- Decisions that can be made now: strict TypeScript monorepo, pnpm workspace, Fastify-ready API package placeholder, Zod validation, Vitest, ESLint, Prettier, Docker Compose for local PostgreSQL/Redis, pure framework-independent domain package, simulator/dry-run default.
- Decisions waiting for PoC or verified data: live Empire and Steam adapter implementation, external field mappings, official rate limits, buy/bid retry safety, Steam offer acceptance automation, identity resolution, and production dashboard workflows.
