# Post-Milestone 8 Detailed Specification

This document defines the remaining work after Milestone 8. It is intentionally contract-first and fail-closed. It does not authorize live Empire or Steam activity by itself.

## Global Rules For Milestones 9-15

- External Empire and Steam behavior remains blocked until the relevant contract is `VERIFIED` in `docs/04_EXTERNAL_CONTRACTS.md`.
- No endpoint, payload, header, WebSocket channel, authentication flow, Steam confirmation behavior, or rate-limit behavior may be guessed.
- Every milestone must keep `APP_MODE=simulation`, `TRADING_MODE=dry_run`, and `LIVE_TRADING_ENABLED=false` as the default posture.
- Live buy, bid, or Trade Offer acceptance remains unavailable until contract evidence, operational approval, durable command persistence, value caps, reconciliation, and dry-run proof all pass.
- Every behavior change requires tests, docs updates, and quality gates.
- Any milestone that cannot proceed because contract evidence is missing must stop at interfaces, fixtures, simulators, and fail-closed gates.

## Readiness Levels

| Level | Meaning | Current Status | Required To Advance |
|---|---|---|---|
| Simulation | Deterministic local fixtures and simulator only | Available | Keep deterministic replay green |
| Dry-run | Proposed commands recorded, no external send | Partially available | Persisted audit trail, dashboard flow, repository durability |
| Verified read-only | External reads from verified contracts only | Blocked | Verified contracts with fixtures, schemas, and contract tests |
| Low-value live | One verified transaction method under strict caps | Blocked | Verified transaction contract, command durability, reconciliation, operator approval |
| Production | Multi-account live operation with ops controls | Blocked | All release evidence, load/chaos, alerts, backup/restore, legal approval |

## Milestone 9 - Documentation Reconciliation And Readiness Matrix

### Goal

Normalize project planning language so future work cannot confuse safe-scope implementation milestones with live-ready milestones.

### Deliverables

- Reconcile milestone numbering differences between `docs/02_CODEX_MASTER_PROMPT.md` and `docs/IMPLEMENTATION_PLAN.md`.
- Add a canonical readiness matrix to `docs/IMPLEMENTATION_PLAN.md` or link to this document.
- Add a current-state checklist showing which repository features are complete, partial, blocked, or explicitly out of scope.
- Add a "live readiness blockers" list that points to unverified contracts, persistence gaps, ops gaps, and dashboard gaps.

### Dependencies

- Existing docs in `docs/`.
- No external data required.

### Implementation Notes

- Prefer docs-only changes.
- Do not rename existing code packages or move directories.
- If milestone numbering is kept as-is, document the mapping instead of rewriting history.

### Tests And Verification

- Run markdown/link scan if available.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` only if docs changes touch generated imports or examples.

### Exit Criteria

- A new agent can tell which capabilities are safe to run locally and which are blocked.
- Docs explicitly say the repository is not live-operational.
- No contract is upgraded to `VERIFIED`.

### Risks

- Over-editing historical docs could make prior ADRs harder to interpret.

## Milestone 10 - Real Persistence And Secret Safety

### Goal

Move persistence and secret handling from in-memory/test abstractions toward local durable infrastructure while preserving dry-run-only behavior.

### Deliverables

- PostgreSQL driver-backed repository implementations for accounts, commands, auctions, purchases, and redacted events.
- Migration runner wired to a real PostgreSQL client.
- Transactional command persistence before any send-capable code path can exist.
- Envelope encryption interface for secrets.
- Local development encryption implementation using non-production keys from environment variables.
- Secret redaction tests for logs, API responses, event evidence, and fixture storage.

### Dependencies

- Existing migration abstraction.
- Dependency approval for PostgreSQL driver and, if needed, encryption support.
- `DATABASE_URL` and encryption key environment validation.

### Implementation Notes

- Keep all live trading disabled.
- Do not store real Steam passwords, 2FA secrets, cookies, or API tokens in fixtures.
- Design secret APIs so plaintext is only accepted at write time and never returned by read APIs.
- Preserve in-memory repositories for tests.

### Tests

- Repository integration tests against local PostgreSQL.
- Migration idempotency tests.
- Transaction rollback tests.
- Secret encryption/decryption tests with test-only keys.
- Redaction tests proving plaintext does not appear in logs/API/event outputs.
- Restart reconstruction tests using durable data.

### Exit Criteria

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant integration tests pass.
- Unknown command outcomes persist durably and are queryable for reconciliation.
- No plaintext secret appears in persisted evidence or logs.

### Risks

- Adding database dependencies can create environment-specific test failures.
- Encryption key rotation design may need a separate ADR.

## Milestone 11 - Verified Read-Only Contract Intake

### Goal

Create the process and artifacts for turning authorized external evidence into verified read-only contracts.

### Deliverables

- Contract intake template for each external contract.
- Redacted fixture directory structure and naming convention.
- Runtime schemas for any authorized captured response.
- Contract tests that prove fixture compatibility.
- Registry update process for moving a contract from `UNVERIFIED` to `VERIFIED`.
- Evidence provenance notes with source, date, and allowed usage scope.

### Dependencies

- Official documentation or authorized redacted captures.
- Legal/ToS approval for the specific read-only integration behavior.
- Security approval for storing redacted fixtures.

### Implementation Notes

- This milestone may remain docs/test-only if no authorized evidence exists.
- Do not add executable adapter URLs until the corresponding contract is verified.
- Keep candidate research notes outside production constants.

### Tests

- Contract tests for every verified fixture version.
- Runtime schema success and rejection tests.
- Redaction tests for fixture content.
- Negative tests proving incomplete contract entries remain unverified.

### Exit Criteria

- At least one read-only contract can be marked `VERIFIED`, or the milestone explicitly records that no authorized evidence exists and remains blocked.
- No transaction contract is enabled by read-only verification.

### Risks

- Captures may include sensitive identifiers requiring stronger redaction policy.
- External platform behavior may be incompatible with permitted integration.

## Milestone 12 - Read-Only Adapters

### Goal

Implement read-only Empire and Steam adapters only for contracts verified in Milestone 11.

### Deliverables

- Empire identity/balance adapter for verified contracts.
- Fixed-price item and auction read adapter for verified contracts.
- Reference-price read adapter for verified contracts.
- Steam offer discovery adapter for verified contracts.
- Timeout, cancellation, rate-limit, retry, and backoff behavior based only on verified contracts.
- Redacted raw-event persistence for read-only evidence.

### Dependencies

- Verified contract entries, fixtures, schemas, and tests.
- Durable persistence from Milestone 10.
- Runtime configuration for credentials without exposing secrets.

### Implementation Notes

- No buy, bid, accept, cancel, or confirmation command.
- Adapters fail closed if contract status is not `VERIFIED`.
- Every external response must be validated before it reaches domain logic.
- All logs must use redacted structured fields.

### Tests

- Contract tests against verified fixtures.
- Adapter unit tests using fake transports.
- Timeout and cancellation tests.
- Rate-limit handling tests.
- Replay tests for duplicates, out-of-order events, disconnects, and stale data.
- Persistence tests for redacted raw evidence.

### Exit Criteria

- Read-only dry-run can consume verified data without producing live commands.
- No unverified contract path appears in executable adapter code.

### Risks

- Verified read contracts may expose identifiers that require schema or persistence revisions.

## Milestone 13 - Dry-Run E2E Dashboard

### Goal

Build the operator workflow for configuring dry-run accounts, reviewing proposed commands, and controlling kill/pause without live sends.

### Deliverables

- Dashboard screens for account list, account status, dry-run configuration, proposed commands, audit timeline, and safety controls.
- API endpoints for config revisions, dry-run history, command audit, worker state, global kill switch, and per-account pause.
- Durable config revisioning.
- UI redaction for all secret-bearing fields.
- E2E dry-run flow from dashboard configuration to proposed command history.

### Dependencies

- Control-plane skeleton.
- Durable persistence.
- Dry-run decision engine.
- Operator authz design.

### Implementation Notes

- Keep UI operational and restrained; avoid showing estimated P&L as realized profit.
- All write APIs must require authorization.
- Live mode controls must remain disabled or visibly blocked until later milestones.

### Tests

- API tests for authz, validation, config revisions, kill switch, pause, and redaction.
- Component or browser tests for dashboard workflows.
- E2E test: configure dry-run -> simulator/replay event -> proposed command visible -> pause blocks future command.
- Accessibility and responsive layout smoke tests.

### Exit Criteria

- Operator can run a full dry-run review loop locally.
- UI never sends or implies live buy/bid/accept actions.

### Risks

- Dashboard can accidentally create false confidence if proposed commands look like executed trades.

## Milestone 14 - Controlled Transaction Proof Of Concept

### Goal

Enable exactly one low-value transaction method only after its contract is verified and all safety gates are satisfied.

### Deliverables

- One transaction adapter method selected by verified contract readiness.
- Feature flag for that one method only.
- Durable command record before network send.
- Correlation ID and idempotency key behavior if verified.
- Unknown outcome reconciliation flow.
- Per-item, per-command, per-account daily, and global daily caps.
- Manual operator approval workflow for first low-value validation.
- Rollback/disable procedure in runbook.

### Dependencies

- Verified transaction contract for the selected method.
- Durable persistence.
- Read-only adapter and reconciliation data.
- Production preflight gates adapted for low-value validation.
- Legal/ToS and operator approval.

### Implementation Notes

- Do not implement multiple transaction methods at once.
- Do not retry timeout blindly.
- If idempotency or retry safety is not verified, mark timeout as `UNKNOWN` and reconcile.
- Steam Trade Offer accept remains blocked unless Steam accept/confirmation contract is separately verified.

### Tests

- Contract tests for transaction request/response fixtures.
- Command persistence-before-send tests.
- Timeout -> unknown -> reconciliation tests.
- No blind retry tests.
- Value cap tests.
- Kill switch and account pause tests.
- Duplicate command prevention tests.
- Audit evidence redaction tests.

### Exit Criteria

- One low-value transaction method works in an approved controlled environment.
- Every unknown outcome is reconciled or held for manual review.
- Release evidence remains blocked for production until broader hardening passes.

### Risks

- Platform may not permit safe automation; if so, stop live transaction work.

## Milestone 15 - Production Operations Hardening

### Goal

Prepare the system for production consideration after verified integrations and controlled validation exist.

### Deliverables

- Multi-account worker isolation with serialized transaction queues.
- Backpressure and bounded concurrency.
- Redis-backed coordination where justified.
- Metrics and alerts for command outcomes, unknown reconciliation, rate limits, worker crashes, stale data, and kill switch state.
- Backup/restore implementation and documented recovery drill.
- Load test with at least 20 simulated accounts.
- Chaos tests for worker crash, PostgreSQL transient failure, Redis transient failure, WSS churn, and restart recovery.
- CI-generated release evidence.
- Production runbook with incident roles and rollback steps.

### Dependencies

- Verified read and transaction contracts.
- Durable persistence.
- Controlled transaction PoC results.
- Dashboard/operator workflows.

### Implementation Notes

- Production readiness requires all release evidence blockers to be empty.
- Alerts must fail toward pausing transactions, not toward continuing silently.
- Backups must be tested through restore, not just created.

### Tests

- Load and burst tests.
- Chaos tests.
- Backup/restore integration tests.
- Alert rule tests.
- Restart and reconciliation tests.
- Security tests for authz, redaction, secret scanning, malicious input, and fixture safety.

### Exit Criteria

- Runbook release checklist passes.
- Release evidence report is `ready` with immutable CI inputs.
- Production preflight is `ready`.
- All used external contracts are `VERIFIED`.
- Legal/ToS approval is documented.

### Risks

- Operational complexity may exceed expected benefit; production launch should remain optional and explicitly approved.
