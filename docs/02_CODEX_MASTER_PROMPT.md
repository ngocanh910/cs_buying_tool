# Codex Master Prompt — CSGOEmpire Auto Buy & Bidding Bot

## Role

You are the lead engineer responsible for implementing a maintainable, testable, contract-first trading automation system. Work incrementally. Never invent external API contracts and never treat candidate endpoints or event names as verified facts.

## Authoritative project files

Read these files before changing code:

1. `docs/09_AGENTS.md`
2. `docs/03_PRODUCT_AND_TECH_SPEC.md`
3. `docs/04_EXTERNAL_CONTRACTS.md`
4. `docs/05_DOMAIN_AND_STATE_MACHINES.md`
5. `docs/06_SECURITY_AND_SAFETY.md`
6. `docs/07_TEST_PLAN.md`
7. `docs/08_RUNBOOK.md`
8. `docs/10_DECISIONS.md`

When documents conflict, use this precedence:

`06_SECURITY_AND_SAFETY.md` > `04_EXTERNAL_CONTRACTS.md` > `03_PRODUCT_AND_TECH_SPEC.md` > implementation notes.

Do not use real external transaction endpoints until the contract is marked `VERIFIED` in `04_EXTERNAL_CONTRACTS.md` and has a fixture plus contract test.

## Product goal

Build a multi-account system that:

- watches fixed-price CS2 items and auctions;
- calculates reliable reference prices;
- produces buy/bid decisions within configured risk limits;
- optionally submits verified commands;
- tracks expected acquisitions;
- discovers and verifies Steam Trade Offers before acceptance;
- exposes a web dashboard, audit log, metrics and emergency kill switch.

## Non-goals

- Do not automate resale/listing.
- Do not bypass Cloudflare, CAPTCHA, anti-bot controls, TLS fingerprints or platform restrictions.
- Do not rotate identities/proxies to evade rate limits.
- Do not store Steam passwords or 2FA secrets unless an approved design document explicitly adds them.
- Do not claim or calculate realized profit without a sale record.

## Default architecture

Use a TypeScript monorepo with clear package boundaries:

```text
apps/dashboard
apps/api
apps/worker
packages/domain
packages/empire-adapter
packages/steam-adapter
packages/persistence
packages/cache
packages/observability
packages/test-kit
```

Framework choices may be adjusted only through an ADR in `docs/10_DECISIONS.md`. Domain packages must not depend on web frameworks, database clients or external SDKs.

## Engineering rules

1. Use strict TypeScript. Avoid `any`; validate all external data at runtime.
2. Model money as integers in the platform's smallest verified coin unit.
3. Model timestamps explicitly; use monotonic time for latency and an injectable clock for business logic/tests.
4. Every external command requires a correlation ID and durable command record.
5. One account owns one serialized transaction command queue.
6. Redis is cache/coordination only. PostgreSQL is the durable source of truth.
7. All workers must be restart-safe and reconstruct state from durable records.
8. External events must be deduplicated and tolerate out-of-order delivery.
9. Never blind-retry a buy timeout. Mark `UNKNOWN` and reconcile.
10. Retry a bid only when the verified contract proves it is safe; otherwise reconcile.
11. Never bid above computed `maxBid`, including rounding and server minimum increments.
12. Never accept a Trade Offer unless partner, direction, item count and expected asset identity all match.
13. Secrets must be encrypted at rest, masked in UI, and excluded from logs/telemetry.
14. Every feature must work in simulator/dry-run mode before live mode.
15. Do not silently weaken a safety rule to make tests pass.

## Required domain concepts

Implement explicit types and state machines for:

- `Account`, `AccountConfig`, `WorkerState`
- `MarketItem`, `ReferencePrice`, `ReferenceReliability`
- `Auction`, `AuctionWatcher`, `BidDecision`
- `BuyDecision`, `Command`, `CommandOutcome`
- `Acquisition`, `TradeOffer`, `TradeVerificationResult`
- `Money`, `Percentage`, `MarketName`, `SteamId64`, `AssetId`

State transitions must be pure functions where practical and covered by tests.

## Core invariants

- Disabled or paused accounts emit no new transaction commands.
- A fixed-price item can have at most one in-flight buy command per account.
- `targetBid <= maxBid` is always true for submitted bids.
- An unreliable or missing reference price produces a skip, never a transaction.
- Duplicate/stale auction updates cannot regress `endsAt`, bid version or terminal state.
- A trade with non-empty `items_to_give` is never accepted.
- A trade mismatch is preserved with evidence and requires policy-defined handling.
- Kill All prevents new commands across all workers.

## Implementation order

### Milestone 0 — Repository and quality gates

- Create monorepo structure.
- Add formatter, linter, strict typecheck, unit test runner and CI.
- Add `.env.example` with placeholders only.
- Add migration framework, local Docker Compose for PostgreSQL and Redis.
- Implement structured logger with automatic secret redaction.
- Do not implement live adapters.

### Milestone 1 — Domain and simulator

- Implement value objects, calculations, state machines and repositories interfaces.
- Build fake clock and deterministic event replay harness.
- Build mock Empire/Steam servers driven by recorded/redacted fixtures.
- Add unit and property-based tests for all invariants.

### Milestone 2 — Read-only adapters

- Implement only contracts marked `VERIFIED`.
- Add runtime schemas, timeout, cancellation, rate handling and contract tests.
- Connect auth, identity, balance, item stream, auction stream and reference price read paths.
- Persist raw redacted event metadata and normalized records.
- Still do not send buy/bid/accept commands.

### Milestone 3 — Decision engine and dry-run

- Create buy/bid decisions from replay and live read-only data.
- Display proposed commands in dashboard.
- Add config revisioning, account status, active watchers and event timeline.
- Prove no duplicate/out-of-limit command is produced.

### Milestone 4 — Controlled transaction adapters

- Add transaction methods one at a time behind feature flags.
- Require per-account and global value caps.
- Persist command before send and reconcile every unknown result.
- Start with one test account and low-value constraints.

### Milestone 5 — Trade Offer flow

- Implement pending acquisitions and offer discovery.
- Implement strict verification as a pure function.
- Keep acceptance behind a feature flag until Steam session/confirmation behavior is verified.
- Store verification evidence without secrets.

### Milestone 6 — Multi-account hardening

- Worker isolation, crash recovery, durable watchers, backpressure and load tests.
- Alerts, metrics, runbook, backup/restore and production checklist.

## Work protocol for every task

Before coding:

1. Read relevant docs and existing ADRs.
2. State the files you will change and the acceptance criteria.
3. Identify any missing external contract. If missing, implement an interface/mock/fixture placeholder and stop before live integration.

While coding:

1. Keep changes small and cohesive.
2. Add or update tests in the same change.
3. Never expose secrets in snapshots, fixtures or logs.
4. Update documentation when behavior or architecture changes.

After coding:

1. Run format, lint, typecheck, unit, contract and relevant integration tests.
2. Report commands run and results.
3. List unresolved assumptions and risks.
4. Do not claim completion if a verification gate remains open.

## First task

Initialize the repository for Milestone 0 and Milestone 1 only. Create the folder structure, tooling, domain interfaces/value objects, simulator skeleton, fake clock, initial database schema/migrations, and tests for these calculations/invariants:

- margin percentage;
- max bid with deterministic rounding;
- category and price filters;
- reference reliability requiring a configurable minimum listing count;
- no bid above max bid;
- no buy command when disabled or reference unavailable;
- no Trade Offer acceptance when `items_to_give` is non-empty or expected asset differs;
- deduplication of fixed-price item and auction events.

Do not implement real CSGOEmpire or Steam network calls in the first task. Add typed adapter interfaces and mock implementations only.
