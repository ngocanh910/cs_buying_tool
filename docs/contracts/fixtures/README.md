# Redacted Contract Fixtures

This directory is reserved for authorized, redacted external contract fixtures.

Required path format:

```text
docs/contracts/fixtures/<contract-id>/v<number>/redacted-<name>.json
```

Rules:

- Store only official documentation examples or authorized redacted captures.
- Do not store raw cookies, authorization headers, API keys, Steam session values, passwords, 2FA secrets, or real account identifiers.
- Keep candidate research notes outside executable source code.
- Adding a fixture does not verify a contract by itself.
- A contract can move to `VERIFIED` only after intake provenance, runtime schema validation, contract tests, documented behavior, and registry update all pass.

No real Empire or Steam fixtures are currently stored in this repository.
