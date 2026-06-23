# External Contracts Registry

Every network contract starts as `UNVERIFIED`. It can become `VERIFIED` only when it has:

1. an official document or authorized redacted capture;
2. request and response fixtures;
3. runtime schema validation;
4. a contract test;
5. documented auth, rate limit, timeout, idempotency and error behavior.

| Contract | Status | Evidence | Fixture | Contract test | Notes |
|---|---|---|---|---|---|
| Empire identity/auth | UNVERIFIED | TBD | TBD | TBD | Must resolve account identity safely |
| Socket metadata/handshake | UNVERIFIED | TBD | TBD | TBD | Include heartbeat/reconnect |
| New fixed-price item event | UNVERIFIED | TBD | TBD | TBD | Need real field mapping |
| Auction discovered/update/end | UNVERIFIED | TBD | TBD | TBD | Must capture anti-snipe `endsAt` extension |
| Similar items/reference price | UNVERIFIED | TBD | TBD | TBD | Confirm unit, pagination and active listing semantics |
| Buy command | UNVERIFIED | TBD | TBD | TBD | Determine idempotency and reconciliation |
| Bid command | UNVERIFIED | TBD | TBD | TBD | Determine minimum next bid and timeout semantics |
| Balance/history | UNVERIFIED | TBD | TBD | TBD | Used for pre-check and reconciliation |
| Steam offer discovery | UNVERIFIED | TBD | TBD | TBD | Confirm fields and pagination |
| Steam accept/confirmation | UNVERIFIED | TBD | TBD | TBD | Confirm session/mobile confirmation requirements |

## Rules

- Never import an unverified endpoint into a production adapter.
- Keep candidate paths in research notes, not executable constants.
- Fixtures must be redacted and must not contain API keys, cookies, passwords or 2FA secrets.
- Contract changes require versioned fixtures and regression tests.
- Milestone 11 intake candidates must use `docs/contracts/CONTRACT_INTAKE_TEMPLATE.md`.
- Redacted fixture paths must follow `docs/contracts/fixtures/<contract-id>/v<number>/redacted-<name>.json`.
- Read-only intake acceptance does not enable transaction methods.

## Milestone 1 implementation note

All executable adapter code created in Milestone 1 is fake, in-memory, or deterministic simulator code. Each gateway exposes `UNVERIFIED_EXTERNAL_CONTRACT` status and contains no guessed endpoint URL, payload shape, header set, WebSocket channel, authentication flow, or Steam confirmation behavior.

## Milestone 3 implementation note

Milestone 3 adds runtime schemas only for internal raw snapshots and a dry-run decision engine that persists proposed commands. It does not add live or read-only Empire/Steam adapters because every external endpoint, event, payload, header, WebSocket channel, and authentication flow in this registry remains `UNVERIFIED_EXTERNAL_CONTRACT`.

## Milestone 5 implementation note

Milestone 5 adds a code-level verification harness for future external contracts. The harness requires official documentation or authorized redacted capture evidence, redacted fixtures without secrets, runtime schema names, contract test names, and documented auth/rate-limit/timeout/idempotency/error behavior before any contract can evaluate to `VERIFIED`.

No real Empire or Steam contract has been verified in this repository yet. No endpoint, payload, header, WebSocket channel, authentication flow, or live/read-only adapter was added.

## Milestone 11 implementation note

Milestone 11 adds a contract intake template, fixture directory policy, and pure `evaluateContractIntake` gate for future read-only evidence. It does not add any real fixture, executable endpoint, payload, header, WebSocket channel, authentication flow, or adapter behavior. All contracts in this registry remain `UNVERIFIED`.
