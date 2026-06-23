# External Contract Intake Template

Use this template only for official documentation or authorized redacted captures. Do not paste raw credentials, cookies, Steam session data, API tokens, full request headers, or real account identifiers.

## Contract

- Contract ID:
- Platform: Empire or Steam
- Intended scope: read_only
- Proposed runtime schema:
- Proposed contract test:

## Evidence Provenance

- Evidence source: official_documentation or authorized_redacted_capture
- Evidence reference:
- Captured or published date:
- Approved usage scope:
- Reviewer or approver:

## Redaction Checklist

- API keys removed:
- Cookies removed:
- Authorization headers removed:
- Session identifiers removed:
- Real account identifiers removed or replaced:
- Steam 2FA/mobile confirmation data absent:

## Fixture

- Fixture path:
- Fixture version:
- Redacted: yes
- Contains secrets: no
- Notes:

## Behavior Notes

- Authentication behavior:
- Rate-limit behavior:
- Timeout behavior:
- Idempotency behavior:
- Error behavior:

## Registry Update

Move a contract to `VERIFIED` only after:

1. this intake document is complete;
2. the fixture is redacted and stored under `docs/contracts/fixtures/<contract-id>/v<number>/`;
3. a runtime schema validates the fixture;
4. a contract test proves fixture compatibility;
5. `evaluateContractIntake` accepts the candidate;
6. the external contract registry links the evidence, fixture, schema, and test.
