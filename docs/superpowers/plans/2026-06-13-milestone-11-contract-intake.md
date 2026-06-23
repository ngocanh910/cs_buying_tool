# Milestone 11 Contract Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fail-closed process for turning authorized external evidence into verified read-only contract candidates without enabling live Empire or Steam integrations.

**Architecture:** Extend the existing `packages/contracts` verification harness with an intake evaluator. Keep it pure and data-only: no network calls, no endpoint constants, no credentials, and no executable adapters.

**Tech Stack:** TypeScript strict mode, Vitest, existing contract registry docs, Markdown templates.

---

### Task 1: Contract Intake Evaluation

**Files:**
- Modify: `packages/contracts/src/external-contracts.ts`
- Modify: `packages/contracts/src/external-contracts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("accepts read-only intake candidates with authorized provenance and redacted fixture policy", () => {
  const result = evaluateContractIntake({
    contractId: "empire.balance",
    intendedScope: "read_only",
    evidence: {
      source: "authorized_redacted_capture",
      capturedAt: "2026-06-13",
      reference: "docs/contracts/intake/empire.balance.md",
      approvedForUse: true
    },
    fixture: {
      path: "docs/contracts/fixtures/empire.balance/v1/redacted-response.json",
      redacted: true,
      containsSecrets: false
    },
    runtimeSchemaName: "empireBalanceReadOnlySchema",
    contractTestName: "empire-balance-read-only.contract.test.ts"
  });

  expect(result).toEqual({ accepted: true, issues: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/contracts/src/external-contracts.test.ts`
Expected: FAIL because `evaluateContractIntake` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add intake types and an evaluator that requires read-only scope, approved provenance, ISO date, docs-local references, redacted fixture path under `docs/contracts/fixtures/<contractId>/v<version>/`, runtime schema name, and contract test name.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test packages/contracts/src/external-contracts.test.ts`
Expected: PASS.

### Task 2: Negative Intake Gates

**Files:**
- Modify: `packages/contracts/src/external-contracts.test.ts`
- Modify: `packages/contracts/src/external-contracts.ts`

- [ ] **Step 1: Write failing negative tests**

```ts
it("rejects transaction-scope intake during read-only milestone", () => {
  const result = evaluateContractIntake({
    ...validReadOnlyIntake,
    intendedScope: "transaction"
  });

  expect(result.accepted).toBe(false);
  expect(result.issues).toContain("INTAKE_SCOPE_NOT_READ_ONLY");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/contracts/src/external-contracts.test.ts`
Expected: FAIL until negative issue handling exists.

- [ ] **Step 3: Write minimal implementation**

Add issue codes for missing/unapproved evidence, non-local references, unsafe fixtures, missing schema/test names, and transaction scope.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test packages/contracts/src/external-contracts.test.ts`
Expected: PASS.

### Task 3: Intake Documentation

**Files:**
- Create: `docs/contracts/CONTRACT_INTAKE_TEMPLATE.md`
- Create: `docs/contracts/fixtures/README.md`
- Modify: `docs/04_EXTERNAL_CONTRACTS.md`
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `docs/10_DECISIONS.md`
- Modify: `README.md`

- [ ] **Step 1: Add docs**

Document required provenance fields, redaction requirements, fixture path convention, registry update steps, and the fact that no current contract is verified.

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
