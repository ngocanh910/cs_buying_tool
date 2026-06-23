# Milestone 8 Release Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure release evidence report that summarizes preflight, quality gates, safety scans, and external contract posture without enabling deployment or live trading.

**Architecture:** Keep release evidence in `apps/worker` as a release-readiness layer on top of production preflight. The report consumes already-computed results and never invokes shell commands, network calls, Empire, Steam, database, Redis, or dashboard services.

**Tech Stack:** TypeScript strict mode, Vitest, existing `ProductionPreflightDecision` types.

---

### Task 1: Release Evidence Report

**Files:**
- Create: `apps/worker/src/release-evidence.test.ts`
- Create: `apps/worker/src/release-evidence.ts`

- [x] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildReleaseEvidenceReport } from "./release-evidence.js";

describe("buildReleaseEvidenceReport", () => {
  it("blocks release when preflight is blocked", () => {
    expect(
      buildReleaseEvidenceReport({
        generatedAt: new Date("2026-06-11T00:00:00.000Z"),
        preflight: { kind: "blocked", issues: ["UNVERIFIED_TRANSACTION_CONTRACT"] },
        qualityGates: [{ name: "pnpm test", passed: true }],
        safetyScans: [{ name: "live URL scan", passed: true }],
        externalContractsVerified: false
      })
    ).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "blocked",
      blockers: ["UNVERIFIED_TRANSACTION_CONTRACT", "EXTERNAL_CONTRACTS_NOT_VERIFIED"],
      qualityGateSummary: { passed: 1, failed: 0 },
      safetyScanSummary: { passed: 1, failed: 0 }
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test apps/worker/src/release-evidence.test.ts`

Expected: FAIL because `./release-evidence.js` does not exist.

- [x] **Step 3: Implement minimal pure report builder**

Create typed quality gate and safety scan inputs, accumulate blockers, and return `status: "ready"` only when preflight is ready, all gates/scans pass, and external contracts are verified.

- [x] **Step 4: Run targeted tests**

Run: `pnpm test apps/worker/src/release-evidence.test.ts`

Expected: PASS.

### Task 2: Documentation And Verification

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `docs/10_DECISIONS.md`
- Modify: `docs/08_RUNBOOK.md`
- Modify: `README.md`

- [x] **Step 1: Document Milestone 8 safe scope**

Record that Milestone 8 is evidence/reporting only and does not run commands or enable live trading.

- [x] **Step 2: Run quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm simulator
```

Expected: all commands exit 0.
