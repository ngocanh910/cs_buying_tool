# Product & Technical Specification

This file is the Markdown companion to `01_CSGOEmpire_Bot_Consolidated_Spec.docx`.

## Product scope

- Multi-account isolated workers.
- Fixed-price sniping with reliable reference price and no blind retry.
- Auction bidding within a server-derived countdown and strict max bid.
- Pending acquisition and strict Steam Trade Offer verification.
- Dashboard, audit, history, metrics, kill switch and dry-run mode.

## Canonical formulas

```text
marginPct = (referencePrice - listedPrice) / referencePrice * 100
maxBid = floor(referencePrice * (1 - stopThresholdPct / 100))
```

Money is stored as integer smallest coin units. Missing/unreliable reference data always means `SKIP`.

## Key reconciliations from V3/V4

- Never hard-code auction duration; use and update server `endsAt`.
- SteamID64 may be auto-resolved only through a verified identity contract; otherwise request and verify it.
- Repeat bidding is allowed only inside the active auction, below max bid and under bounded rate/retry guards.
- P&L is split into estimated and realized; MVP requires estimated only.
- A single hard-coded Empire bot SteamID is not sufficient unless the platform contract proves it.
- Candidate endpoints and event names from V3 are not production contracts until verified.

## Safety

No anti-bot bypass, CAPTCHA bypass, TLS fingerprint spoofing, proxy rotation for evasion or blind request replay. Fail closed when the platform does not permit or support the integration.
