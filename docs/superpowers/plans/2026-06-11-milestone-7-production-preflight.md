# Milestone 7 Production Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a testable production hardening preflight gate that reports why a release cannot proceed unless production/live configuration, verified contracts, value caps, tests, backups, alerts, and approvals are present.

**Architecture:** Keep the gate in `apps/worker` because it evaluates runtime release readiness and depends on config, contract verification, and worker live caps. The gate is pure and must not call Empire, Steam, databases, Redis, or network services.

**Tech Stack:** TypeScript strict mode, Vitest, existing `AppEnv`, `ExternalContractEvaluation`, and `LowValueLiveCaps` types.

---

### Task 1: Production Preflight Gate

**Files:**
- Create: `apps/worker/src/production-preflight.test.ts`
- Create: `apps/worker/src/production-preflight.ts`

- [x] **Step 1: Write failing tests**

```ts
import { coinAmount } from "@csgoempire-bot/domain";
import { describe, expect, it } from "vitest";
import { evaluateProductionPreflight } from "./production-preflight.js";

describe("evaluateProductionPreflight", () => {
  it("blocks release when transaction contracts are unverified", () => {
    const result = evaluateProductionPreflight({
      env: {
        NODE_ENV: "production",
        APP_MODE: "live",
        TRADING_MODE: "live",
        LIVE_TRADING_ENABLED: true,
        LOG_LEVEL: "info"
      },
      transactionContracts: [{ status: "UNVERIFIED_EXTERNAL_CONTRACT", issues: ["REGISTRY_STATUS_NOT_VERIFIED"] }],
      caps: { perCommand: coinAmount(1), perAccountDaily: coinAmount(5), globalDaily: coinAmount(10) },
      dryRunReplayReviewed: true,
      loadTestSimulatedAccounts: 20,
      chaosTestsPassed: true,
      backupRestoreTested: true,
      alertsConfigured: true,
      secretScanPassed: true,
      legalApprovalDocumented: true
    });

    expect(result).toEqual({ kind: "blocked", issues: ["UNVERIFIED_TRANSACTION_CONTRACT"] });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test apps/worker/src/production-preflight.test.ts`

Expected: FAIL because `./production-preflight.js` does not exist.

- [x] **Step 3: Implement minimal gate**

Create `evaluateProductionPreflight(input)` returning either `{ kind: "ready" }` or `{ kind: "blocked", issues }`.

- [x] **Step 4: Run targeted tests**

Run: `pnpm test apps/worker/src/production-preflight.test.ts`

Expected: PASS.

### Task 2: Documentation And Verification

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `docs/10_DECISIONS.md`
- Modify: `docs/08_RUNBOOK.md`
- Modify: `README.md`

- [x] **Step 1: Document current Milestone 7 safe scope**

Record that production hardening is a preflight gate only and current repo cannot pass release readiness until verified integrations exist.

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
