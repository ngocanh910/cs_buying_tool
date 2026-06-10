# Test Plan

## Required suites

- Unit tests: calculations, filters, state transitions, verification policy.
- Property tests: never bid above max; disabled means no command; unsafe trade never accepted.
- Contract tests: one suite per verified external contract and fixture version.
- Replay tests: duplicates, out-of-order events, disconnects, `endsAt` extension, time skew.
- Integration tests: PostgreSQL, Redis, encryption, queues, restart recovery.
- E2E tests: dashboard config to dry-run decisions and history.
- Load tests: at least 20 simulated accounts and burst traffic.
- Chaos tests: worker kill, Redis/DB transient failures, WSS churn.
- Security tests: authz, redaction, secret scanning and malicious input.

## Definition of done

A feature is not done unless tests cover success, skip, timeout, duplicate, stale event and restart/recovery paths where relevant.
