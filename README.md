<<<<<<< HEAD
# cs_buying_tool
=======
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
```

`pnpm dev` boots the worker skeleton in simulation/dry-run mode. `pnpm simulator` replays deterministic milestone-one scenarios and prints JSON results.

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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
  worker/       Worker bootstrap skeleton
  simulator/    Deterministic scenario replay
packages/
  domain/       Pure value objects, calculations, policies and state machines
  contracts/    Gateway/repository/clock/id/event interfaces
  config/       Startup environment validation
  observability/ Structured logging with redaction
  empire-adapter/ Fake Empire gateway only
  steam-adapter/ Fake Steam gateway only
  persistence/  In-memory repositories and initial SQL migration
  test-utils/   Fake clock, deterministic IDs and event publisher
docs/
```

## Current Limits

- No real CSGOEmpire or Steam network calls.
- No buy, bid, accept, cancel, or confirmation command is sent to any external service.
- All Empire and Steam contracts remain `UNVERIFIED_EXTERNAL_CONTRACT`.
- No Cloudflare, CAPTCHA, anti-bot, TLS fingerprint, proxy-rotation, or access-control bypass exists.
- Dashboard production implementation is intentionally deferred.
- PostgreSQL driver-backed repositories are not implemented yet; current repositories are in-memory and test-oriented.
- Redis-backed coordination is not implemented yet; only a narrow lease abstraction exists.
>>>>>>> 30dfc2d (push GitHub)
