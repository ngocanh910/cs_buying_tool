# Milestone 5 Contract Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a contract verification harness that prevents Empire/Steam contracts from being marked verified unless evidence, redacted fixtures, runtime schemas, and contract tests are present.

**Architecture:** Keep Milestone 5 safe because no authorized external evidence exists in the repo yet. Implement pure TypeScript contract metadata validation in `packages/contracts`; do not add live adapters, endpoints, payload guesses, authentication flows, or network calls.

**Tech Stack:** TypeScript strict mode, Vitest, existing pnpm workspace.

---

### Task 1: Contract Verification Harness

**Files:**
- Create: `packages/contracts/src/external-contracts.ts`
- Create: `packages/contracts/src/external-contracts.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [x] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { evaluateExternalContract } from "./external-contracts.js";

describe("external contract verification", () => {
  it("keeps incomplete contracts unverified", () => {
    const result = evaluateExternalContract({
      id: "empire.identity",
      status: "UNVERIFIED_EXTERNAL_CONTRACT",
      evidence: undefined,
      fixtures: [],
      runtimeSchemaName: undefined,
      contractTestName: undefined,
      behavior: {
        auth: undefined,
        rateLimit: undefined,
        timeout: undefined,
        idempotency: undefined,
        errors: undefined
      }
    });

    expect(result.status).toBe("UNVERIFIED_EXTERNAL_CONTRACT");
    expect(result.issues).toContain("MISSING_EVIDENCE");
  });
});
```

- [x] **Step 2: Run failing test**

Run: `pnpm test packages/contracts/src/external-contracts.test.ts`

Expected: FAIL because `external-contracts.js` does not exist.

- [x] **Step 3: Implement minimal harness**

```typescript
export type ExternalContractEvaluation = {
  readonly status: "UNVERIFIED_EXTERNAL_CONTRACT" | "VERIFIED";
  readonly issues: readonly string[];
};
```

- [x] **Step 4: Export from package**

```typescript
export * from "./external-contracts.js";
```

- [x] **Step 5: Verify targeted tests**

Run: `pnpm test packages/contracts/src/external-contracts.test.ts`

Expected: PASS.

### Task 2: Documentation Update

**Files:**
- Modify: `docs/04_EXTERNAL_CONTRACTS.md`
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `docs/10_DECISIONS.md`

- [x] **Step 1: Record Milestone 5 scope**

Add a note that Milestone 5 added verification harness only. All real Empire/Steam contracts remain `UNVERIFIED_EXTERNAL_CONTRACT`.

- [x] **Step 2: Verify quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm simulator
```

Expected: all commands exit 0.
