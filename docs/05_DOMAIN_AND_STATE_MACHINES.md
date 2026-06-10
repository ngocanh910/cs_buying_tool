# Domain and State Machines

## Worker states

```text
DISABLED -> STARTING -> CONNECTING -> RUNNING
RUNNING -> PAUSED_MANUAL | PAUSED_RATE_LIMIT | DEGRADED | STOPPING
CONNECTING/DEGRADED -> RECONNECTING -> RUNNING
any -> AUTH_ERROR | FATAL_ERROR
```

## Command states

```text
PROPOSED -> PERSISTED -> SENDING -> CONFIRMED
                              -> REJECTED
                              -> UNKNOWN -> RECONCILING -> CONFIRMED | REJECTED | MANUAL_REVIEW
```

## Auction watcher states

```text
DISCOVERED -> WATCHING -> SNIPE_WINDOW -> BID_IN_FLIGHT -> WATCHING
          -> SKIPPED | WON | OUTBID | ENDED | ERROR
```

## Acquisition/trade states

```text
EXPECTED -> WAITING_OFFER -> OFFER_FOUND -> VERIFIED -> ACCEPTING -> ACCEPTED
                                      -> MISMATCH -> REVIEW_REQUIRED
                                      -> WAITING_CONFIRMATION
```

## Invariants

- No command from a disabled/paused account.
- One in-flight buy per account/item.
- Submitted bid never exceeds max bid.
- Missing/unreliable reference means skip.
- Terminal auction states never return to active states.
- Non-empty items-to-give means trade rejection.
- Asset, partner and transaction evidence must match before acceptance.
