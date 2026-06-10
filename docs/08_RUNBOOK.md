# Operations Runbook

## Start-up checks

- Database migration is current.
- Redis and PostgreSQL health checks pass.
- Encryption key is available.
- No external transaction contract is enabled unless verified.
- Global mode defaults to dry-run after an unclean shutdown.

## Incident actions

- Repeated 401: disable account, rotate credential manually, verify audit logs.
- 429/rate limit: respect server delay, pause module/account; do not evade controls.
- WSS churn: reconnect with jitter; if persistent, degrade to no-transaction state.
- Unknown buy/bid result: do not resend blindly; reconcile history/acquisition state.
- Trade mismatch: do not accept; preserve evidence; notify operator.
- Crash loop: stop automatic restarts after threshold and require review.

## Release checklist

- All contracts used by release are VERIFIED.
- Dry-run replay results reviewed.
- Value caps configured.
- Backup/restore tested.
- Alerts and dashboards operational.
- ToS/legal approval documented.
