# Milestone 6 Live Validation Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a low-value live validation gate that blocks all live transaction commands unless verified contracts, explicit live flags, control-plane state, and per-command, per-account daily, and global daily value caps all allow the command.

**Architecture:** Keep Milestone 6 as a pure worker-side decision module. It must not call Empire, Steam, HTTP, WebSocket, or database adapters, and it must preserve the default simulation/dry-run posture.

**Tech Stack:** TypeScript strict mode, Vitest, existing domain value objects, existing external contract evaluation types.

---

### Task 1: Live Validation Decision Module

**Files:**
- Create: `apps/worker/src/live-validation-gate.test.ts`
- Create: `apps/worker/src/live-validation-gate.ts`

- [x] **Step 1: Write failing tests**

```ts
import { accountId, coinAmount } from "@csgoempire-bot/domain";
import { describe, expect, it } from "vitest";
import { evaluateLiveCommand } from "./live-validation-gate.js";

describe("evaluateLiveCommand", () => {
  const baseInput = {
    account: { accountId: accountId("account-1"), paused: false, killSwitch: false },
    commandAmount: coinAmount(10),
    accountSpentToday: coinAmount(0),
    globalSpentToday: coinAmount(0),
    caps: { perCommand: coinAmount(25), perAccountDaily: coinAmount(50), globalDaily: coinAmount(100) },
    dryRun: false,
    liveTradingEnabled: true,
    transactionContract: { status: "VERIFIED" as const, issues: [] }
  };

  it("blocks unverified transaction contracts", () => {
    expect(
      evaluateLiveCommand({
        ...baseInput,
        transactionContract: {
          status: "UNVERIFIED_EXTERNAL_CONTRACT",
          issues: ["REGISTRY_STATUS_NOT_VERIFIED"]
        }
      })
    ).toEqual({ kind: "blocked", reason: "CONTRACT_NOT_VERIFIED" });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test apps/worker/src/live-validation-gate.test.ts`

Expected: FAIL because `./live-validation-gate.js` does not exist.

- [x] **Step 3: Implement minimal gate**

Create a pure function with typed block reasons:

```ts
export function evaluateLiveCommand(input: LiveValidationInput): LiveValidationDecision {
  if (!input.liveTradingEnabled) return { kind: "blocked", reason: "LIVE_TRADING_DISABLED" };
  if (input.dryRun) return { kind: "blocked", reason: "DRY_RUN_ENABLED" };
  if (input.transactionContract.status !== "VERIFIED" || input.transactionContract.issues.length > 0) {
    return { kind: "blocked", reason: "CONTRACT_NOT_VERIFIED" };
  }
  if (input.account.killSwitch) return { kind: "blocked", reason: "KILL_SWITCH_ENABLED" };
  if (input.account.paused) return { kind: "blocked", reason: "WORKER_PAUSED" };
  if (input.commandAmount.value > input.caps.perCommand.value) {
    return { kind: "blocked", reason: "PER_COMMAND_CAP_EXCEEDED" };
  }
  if (input.accountSpentToday.value + input.commandAmount.value > input.caps.perAccountDaily.value) {
    return { kind: "blocked", reason: "PER_ACCOUNT_DAILY_CAP_EXCEEDED" };
  }
  if (input.globalSpentToday.value + input.commandAmount.value > input.caps.globalDaily.value) {
    return { kind: "blocked", reason: "GLOBAL_DAILY_CAP_EXCEEDED" };
  }
  return { kind: "allowed" };
}
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm test apps/worker/src/live-validation-gate.test.ts`

Expected: PASS.

### Task 2: Documentation

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `docs/10_DECISIONS.md`
- Modify: `README.md`

- [x] **Step 1: Document Milestone 6 scope**

Record that Milestone 6 only adds a validation gate and does not enable live trading or external sends.

- [ ] **Step 2: Run full quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm simulator
```

Expected: all commands exit 0.
