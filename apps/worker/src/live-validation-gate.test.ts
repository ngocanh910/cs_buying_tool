import { accountId, coinAmount } from "@csgoempire-bot/domain";
import type { ExternalContractEvaluation } from "@csgoempire-bot/contracts";
import { describe, expect, it } from "vitest";
import { evaluateLiveCommand } from "./live-validation-gate.js";
import type { LiveValidationInput } from "./live-validation-gate.js";

const verifiedContract: ExternalContractEvaluation = {
  status: "VERIFIED",
  issues: []
};

const unverifiedContract: ExternalContractEvaluation = {
  status: "UNVERIFIED_EXTERNAL_CONTRACT",
  issues: ["REGISTRY_STATUS_NOT_VERIFIED"]
};

function validInput(): LiveValidationInput {
  return {
    account: {
      accountId: accountId("account-1"),
      paused: false,
      killSwitch: false
    },
    commandAmount: coinAmount(10),
    caps: {
      perCommand: coinAmount(25),
      perAccountDaily: coinAmount(50),
      globalDaily: coinAmount(100)
    },
    accountSpentToday: coinAmount(0),
    globalSpentToday: coinAmount(0),
    dryRun: false,
    liveTradingEnabled: true,
    transactionContract: verifiedContract
  };
}

describe("evaluateLiveCommand", () => {
  it.each([
    {
      name: "live trading is not explicitly enabled",
      override: { liveTradingEnabled: false },
      reason: "LIVE_TRADING_DISABLED"
    },
    {
      name: "dry-run mode is still enabled",
      override: { dryRun: true },
      reason: "DRY_RUN_ENABLED"
    },
    {
      name: "transaction contract is not verified",
      override: { transactionContract: unverifiedContract },
      reason: "CONTRACT_NOT_VERIFIED"
    },
    {
      name: "global kill switch is enabled",
      override: { account: { ...validInput().account, killSwitch: true } },
      reason: "KILL_SWITCH_ENABLED"
    },
    {
      name: "account worker is paused",
      override: { account: { ...validInput().account, paused: true } },
      reason: "WORKER_PAUSED"
    },
    {
      name: "command exceeds per-command cap",
      override: { commandAmount: coinAmount(26) },
      reason: "PER_COMMAND_CAP_EXCEEDED"
    },
    {
      name: "command would exceed per-account daily cap",
      override: { accountSpentToday: coinAmount(45), commandAmount: coinAmount(10) },
      reason: "PER_ACCOUNT_DAILY_CAP_EXCEEDED"
    },
    {
      name: "command would exceed global daily cap",
      override: { globalSpentToday: coinAmount(95), commandAmount: coinAmount(10) },
      reason: "GLOBAL_DAILY_CAP_EXCEEDED"
    }
  ] as const)("blocks when $name", ({ override, reason }) => {
    expect(evaluateLiveCommand({ ...validInput(), ...override })).toEqual({
      kind: "blocked",
      reason
    });
  });

  it("allows a low-value live command only when every safety gate passes", () => {
    expect(evaluateLiveCommand(validInput())).toEqual({ kind: "allowed" });
  });
});
