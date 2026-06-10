# Security and Safety Requirements

## Secrets

- Encrypt secrets at rest using envelope encryption.
- Never return plaintext credentials after initial submission.
- Mask credentials in UI and redact common token/cookie/header fields in logs.
- Never commit secrets or real captured sessions to Git.

## Transaction safety

- Global Kill All and per-account pause.
- Per-item, per-command, per-day and per-account value caps.
- Durable command record before network send.
- Reconciliation for unknown outcomes.
- Dry-run mode is the default until explicitly enabled.

## Trade safety

Accept only when all verified conditions pass:

- expected partner/bot identity;
- `items_to_give` is empty;
- received item count matches;
- app/context/asset identity matches expected acquisition;
- offer is active and linked to a pending acquisition.

Mismatch must never be accepted. Preserve redacted evidence and alert.

## Compliance

Do not implement Cloudflare/CAPTCHA/anti-bot bypass, TLS fingerprint spoofing or proxy rotation intended to evade controls. If permitted integration cannot be established, stop transactions and surface the failure.
