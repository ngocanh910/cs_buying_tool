# CSGOEmpire Auto Buy & Bidding Bot

Contract-first, simulator-first TypeScript workspace for CSGOEmpire fixed-price sniping, auction bidding, and Steam Trade Offer verification.

Live trading is not enabled. The default runtime posture is `APP_MODE=simulation`, `TRADING_MODE=dry_run`, and `LIVE_TRADING_ENABLED=false`.

## Requirements

- Node.js LTS 20+
- pnpm 9+ through Corepack
- Docker Compose for optional local PostgreSQL and Redis

## Install

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
```

## Run

```bash
pnpm dev
pnpm simulator
pnpm --filter @csgoempire-bot/api start
```

`pnpm dev` boots the worker skeleton in simulation/dry-run mode. `pnpm simulator` replays deterministic scenarios and prints JSON results. The API listens on `127.0.0.1:3000` and exposes health plus local control-plane routes.

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm simulator
```

## Local Dependencies

```bash
docker compose up -d postgres redis
```

PostgreSQL migrations currently live in `packages/persistence/migrations/`. Milestone 2 has a dependency-free migration runner abstraction with an atomic transaction hook and in-memory durable repository tests; a real PostgreSQL driver is intentionally not installed yet.

## Project Structure

```text
apps/
  api/          Fastify health/control-plane skeleton
  dashboard/    Reserved for later dashboard work
  worker/       Worker lifecycle and dry-run decision orchestration
  simulator/    Deterministic scenario replay
packages/
  domain/       Pure value objects, calculations, policies and state machines
  contracts/    Gateway/repository/clock/id/event interfaces and guards
  config/       Startup environment validation
  observability/ Structured logging with redaction
  empire-adapter/ Fake Empire gateway only
  steam-adapter/ Fake Steam gateway only
  persistence/  In-memory repositories and initial SQL migration
  test-utils/   Fake clock, deterministic IDs and event publisher
docs/
```

## Current Implementation Scope

- Runtime schemas validate internal raw market/reference snapshots before they enter domain code.
- The dry-run worker engine can record proposed fixed-price buy and auction bid commands.
- Proposed commands are persisted as `status: "proposed"` and `dryRun: true`.
- The dry-run engine never calls `buyItem`, `placeBid`, or Steam accept methods.
- The worker has a low-value live validation gate, but it only returns allow/block decisions and never sends external commands.
- The API exposes local control-plane endpoints for runtime status, global kill switch, per-account pause, and command audit history.
- Set `CONTROL_PLANE_TOKEN`; `/control/*` routes fail closed without `Authorization: Bearer <token>`.
- `apps/dashboard/index.html` is a static safety placeholder, not a production dashboard.
- External contract verification is implemented as a code-level gate, but no real Empire or Steam contract is verified yet.
- Live and read-only external adapters remain deferred until real contracts are verified with evidence, fixtures, schemas, and contract tests.
- A production preflight gate exists for release hardening, but the current repository is expected to remain blocked because no transaction contract is verified.
- A release evidence report can summarize preflight, quality gate, safety scan, and contract posture from explicit inputs.
- The canonical readiness matrix and milestone mapping live in `docs/IMPLEMENTATION_PLAN.md`.
- Post-Milestone 8 roadmap details live in `docs/POST_M8_MILESTONE_SPEC.md`.
- Milestone 10 adds a SQL command repository seam, nested secret redaction, local envelope encryption, and optional `LOCAL_ENCRYPTION_KEY` validation.
- Milestone 11 adds contract intake templates and a read-only evidence gate; no real contract is verified.

## Current Limits

- No real CSGOEmpire or Steam network calls.
- No buy, bid, accept, cancel, or confirmation command is sent to any external service.
- All Empire and Steam contracts remain `UNVERIFIED_EXTERNAL_CONTRACT`.
- The Milestone 6 live gate blocks all transaction paths until live mode is explicit, dry-run is off, contracts are verified, kill switch and account pause are clear, and per-command, per-account daily, and global daily value caps pass.
- The Milestone 7 production preflight gate does not enable production; it reports missing release requirements.
- The Milestone 8 release evidence report does not execute checks, deploy, or enable live trading.
- No guessed endpoint, payload, header, WebSocket channel, or authentication flow is present in executable live adapter code.
- No Cloudflare, CAPTCHA, anti-bot, TLS fingerprint, proxy-rotation, or access-control bypass exists.
- Dashboard production implementation and durable dashboard-backed authz are intentionally deferred.
- PostgreSQL driver-backed repositories are not implemented yet; current durable SQL work is driver-agnostic and tested with a fake SQL client.
- No authorized real Empire or Steam fixtures are stored under `docs/contracts/fixtures/`.
- Redis-backed coordination is not implemented yet; only a narrow lease abstraction exists.
