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

## Milestone 1 implementation note

All executable adapter code created in Milestone 1 is fake, in-memory, or deterministic simulator code. Each gateway exposes `UNVERIFIED_EXTERNAL_CONTRACT` status and contains no guessed endpoint URL, payload shape, header set, WebSocket channel, authentication flow, or Steam confirmation behavior.
