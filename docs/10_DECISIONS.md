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

## ADR-0008 - Milestone 3 adapter scope

**Status:** Accepted

Milestone 3 may add runtime validation, dry-run orchestration, contract guards, and auditable proposed commands. It must not add live or read-only Empire/Steam adapter behavior until the relevant external contracts have evidence, redacted fixtures, runtime schemas, and contract tests.

## ADR-0009 - Milestone 4 control-plane scope

**Status:** Accepted

Milestone 4 introduces a local Fastify control plane and static dashboard placeholder for safe operations. `/control/*` routes fail closed unless `CONTROL_PLANE_TOKEN` is configured and supplied as a bearer token, but production-grade operator identity, durable authorization, and dashboard workflows remain deferred.

## ADR-0010 - Milestone 5 verification gate

**Status:** Accepted

Milestone 5 cannot implement real Empire or Steam read paths until authorized documentation or redacted captures exist. The repository now treats verification as a code-level gate: contracts stay `UNVERIFIED_EXTERNAL_CONTRACT` unless evidence, redacted fixtures, runtime schemas, contract tests, and documented operational behavior are all present.

## ADR-0011 - Milestone 6 live validation scope

**Status:** Accepted

Milestone 6 adds a pure live-command validation gate, not a live sender. A command is blocked unless live trading is explicitly enabled, dry-run is disabled, the relevant transaction contract is verified with no issues, kill switch and per-account pause are clear, and per-command, per-account daily, and global daily low-value caps are not exceeded. Because no Empire or Steam transaction contract is verified yet, buy, bid, and Trade Offer accept commands remain disabled.

## ADR-0012 - Milestone 7 production hardening scope

**Status:** Accepted

Milestone 7 adds a pure production preflight gate rather than production infrastructure or live senders. The gate blocks release readiness unless production/live configuration, verified transaction contracts, value caps, dry-run replay review, load and chaos test evidence, backup/restore validation, alerts, secret scan, and legal approval are all present. The current repository is expected to remain blocked because no Empire or Steam transaction contract is verified.

## ADR-0013 - Milestone 8 release evidence scope

**Status:** Accepted

Milestone 8 adds a pure release evidence report rather than deployment automation. The report summarizes preflight, quality gate, safety scan, and external-contract posture from caller-provided inputs, and it never executes shell commands, reads credentials, contacts external services, or enables live trading. Until a later CI system provides immutable evidence, the report is an audit helper rather than a trust anchor.

## ADR-0014 - Milestone 9 canonical readiness mapping

**Status:** Accepted

Milestone 9 reconciles the original high-level milestone sequence in `docs/02_CODEX_MASTER_PROMPT.md` with the smaller safe-scope implementation milestones in `docs/IMPLEMENTATION_PLAN.md`. Historical milestone text is preserved, and future work should use the canonical readiness matrix and milestone mapping in `docs/IMPLEMENTATION_PLAN.md`. This decision does not mark any Empire or Steam contract as verified and does not authorize live trading.

## ADR-0015 - Milestone 10 safe persistence scope

**Status:** Accepted

Milestone 10 may add driver-agnostic SQL repository seams, local envelope encryption, secret redaction, and environment validation without enabling live trading. A real PostgreSQL driver dependency is still deferred until explicitly approved, so current SQL persistence tests use a fake SQL client and do not claim full PostgreSQL integration readiness.

## ADR-0016 - Milestone 11 contract intake scope

**Status:** Accepted

Milestone 11 adds a read-only external contract intake process, fixture naming policy, and pure intake evaluator. It does not add real Empire or Steam fixtures, does not guess endpoints or payloads, does not mark any contract as `VERIFIED`, and does not enable read-only or transaction adapters.
