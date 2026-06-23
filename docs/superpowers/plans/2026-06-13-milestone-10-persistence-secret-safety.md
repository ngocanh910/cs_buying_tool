# Milestone 10 Persistence And Secret Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local durable-persistence seams and secret-safety primitives while preserving simulation, dry-run, and disabled live trading defaults.

**Architecture:** Keep domain code independent from PostgreSQL, crypto, HTTP, and UI. Add persistence-layer interfaces for SQL execution and envelope encryption, then test them with fake clients so no new database package is required in this checkpoint.

**Tech Stack:** TypeScript strict mode, Vitest, Node `node:crypto`, Zod env validation, existing pnpm workspace.

---

### Task 1: Secret Redaction

**Files:**
- Create: `packages/persistence/src/secret-safety.test.ts`
- Modify: `packages/persistence/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("redacts nested secret-like keys without mutating the original value", () => {
  const input = {
    authorization: "Bearer secret-token",
    nested: { apiKey: "secret-api-key", safe: "visible" },
    list: [{ cookie: "session-cookie" }]
  };

  const redacted = redactSecrets(input);

  expect(JSON.stringify(redacted)).not.toContain("secret-token");
  expect(JSON.stringify(redacted)).not.toContain("secret-api-key");
  expect(JSON.stringify(redacted)).not.toContain("session-cookie");
  expect(redacted).toEqual({
    authorization: "[REDACTED]",
    nested: { apiKey: "[REDACTED]", safe: "visible" },
    list: [{ cookie: "[REDACTED]" }]
  });
  expect(input.nested.apiKey).toBe("secret-api-key");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/persistence/src/secret-safety.test.ts`
Expected: FAIL because `redactSecrets` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add a recursive redactor that handles plain JSON-like objects and arrays, replacing values under keys such as `authorization`, `cookie`, `token`, `apiKey`, `password`, `secret`, and `twoFactorSecret`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test packages/persistence/src/secret-safety.test.ts`
Expected: PASS.

### Task 2: Local Envelope Encryption

**Files:**
- Modify: `packages/persistence/src/secret-safety.test.ts`
- Modify: `packages/persistence/src/index.ts`
- Modify: `packages/config/src/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing tests**

```ts
it("seals and opens plaintext with a local development key", () => {
  const envelope = createLocalEnvelopeEncryption("0123456789abcdef0123456789abcdef");

  const sealed = envelope.seal("plain-secret");

  expect(sealed.ciphertext).not.toContain("plain-secret");
  expect(envelope.open(sealed)).toBe("plain-secret");
});

it("rejects local encryption keys that are not 32 bytes", () => {
  expect(() => createLocalEnvelopeEncryption("short")).toThrow("32-byte");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/persistence/src/secret-safety.test.ts`
Expected: FAIL because `createLocalEnvelopeEncryption` does not exist.

- [ ] **Step 3: Write minimal implementation**

Use AES-256-GCM from `node:crypto`, random 12-byte IVs, and explicit fields for algorithm, key ID, IV, tag, and ciphertext. Add optional `LOCAL_ENCRYPTION_KEY` validation in config and `.env.example` with a non-production placeholder.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test packages/persistence/src/secret-safety.test.ts`
Expected: PASS.

### Task 3: SQL Command Repository Seam

**Files:**
- Modify: `packages/persistence/src/persistence.test.ts`
- Modify: `packages/persistence/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("persists commands through a transaction before send-capable state", async () => {
  const client = new FakeSqlClient();
  const repository = new SqlCommandRepository(client);

  await repository.persist(command);

  expect(client.calls).toContain("begin");
  expect(client.rows.command_records.get("command-1")?.status).toBe("persisted");
});

it("persists unknown outcomes for reconciliation through SQL storage", async () => {
  const client = new FakeSqlClient();
  const repository = new SqlCommandRepository(client, { now: () => new Date("2026-06-13T00:00:01.000Z") });

  await repository.persist(command);
  await repository.markUnknown(command.commandId, "timeout_after_send");

  const pending = await repository.findReconciliationRequired(accountId("account-1"));
  expect(pending[0]?.status).toBe("unknown");
  expect(pending[0]?.unknownReason).toBe("timeout_after_send");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/persistence/src/persistence.test.ts`
Expected: FAIL because `SqlCommandRepository` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add a narrow `SqlClient` query/transaction interface and a `SqlCommandRepository` that maps command records to parameterized SQL operations. Keep it driver-agnostic so a later `pg` wrapper can be added only with dependency approval.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test packages/persistence/src/persistence.test.ts`
Expected: PASS.

### Task 4: Docs And Quality Gates

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `docs/10_DECISIONS.md`
- Modify: `README.md`

- [ ] **Step 1: Document the safe-scope Milestone 10 result**

Record that envelope encryption and SQL repository seams exist, while real `pg` driver-backed repositories remain blocked pending dependency approval and local integration setup.

- [ ] **Step 2: Run verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm simulator
```

Expected: all commands exit 0.
