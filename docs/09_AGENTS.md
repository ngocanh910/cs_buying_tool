# AGENTS.md

## Repository rules for AI coding agents

- Read all files in `/docs` before architectural or external-integration changes.
- Never invent API endpoints, payload fields, WebSocket events or Steam behavior.
- Never turn an `UNVERIFIED` contract into production code.
- Keep domain logic pure and framework-independent.
- Use strict TypeScript and runtime validation at every external boundary.
- Store money as integer smallest units.
- Add tests with every behavior change.
- Never log or commit credentials, cookies, tokens or real account identifiers.
- Never implement anti-bot or access-control bypass.
- Update `docs/DECISIONS.md` for architecture changes.
- Report assumptions and verification gates in every completion summary.
