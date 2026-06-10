# Architecture Decision Log

Use one section per decision.

## ADR-0001 — Contract-first external integrations

**Status:** Accepted

External APIs and WebSocket messages are implemented only after evidence, fixtures, runtime schemas and contract tests exist.

## ADR-0002 — Durable source of truth

**Status:** Accepted

PostgreSQL is the source of truth. Redis is used for cache, pub/sub and bounded coordination only.

## ADR-0003 — Isolated per-account execution

**Status:** Accepted

Each account runs in an isolated worker/process with a serialized transaction command queue.

## ADR-0004 — Dry-run before live transaction mode

**Status:** Accepted

All features must run in simulator and dry-run modes before live command flags can be enabled.

## ADR-0005 - Session 1 milestone scope

**Status:** Accepted

This session is limited to Milestone 0 and Milestone 1: documentation audit, implementation plan, project scaffold, framework-independent domain core, state machines, interfaces, deterministic simulator, and foundation tests. Live Empire and Steam integrations are explicitly out of scope.

## ADR-0006 - Documentation precedence conflict

**Status:** Needs confirmation

The direct session instruction says conflicts should prioritize `09_AGENTS.md`, then Product & Technical Spec. `02_CODEX_MASTER_PROMPT.md` says conflicts should prioritize Security, then External Contracts, then Product & Technical Spec. For this session, direct user instruction and `09_AGENTS.md` are treated as controlling, while the safety and external-contract requirements remain stricter gates wherever they apply.

## ADR-0007 - Default runtime posture

**Status:** Accepted

The default runtime mode is `simulation` plus `dry_run`, and live trading is disabled unless a later milestone adds verified contracts, explicit feature flags, durable command persistence, and value caps.
