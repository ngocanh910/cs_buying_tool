import type { ExternalContractEvaluation } from "@csgoempire-bot/contracts";
import type { CoinAmount } from "@csgoempire-bot/domain";
import type { DryRunAccountControls } from "./dry-run-engine.js";

export type LowValueLiveCaps = {
  readonly perCommand: CoinAmount;
  readonly perAccountDaily: CoinAmount;
  readonly globalDaily: CoinAmount;
};

export type LiveValidationBlockReason =
  | "LIVE_TRADING_DISABLED"
  | "DRY_RUN_ENABLED"
  | "CONTRACT_NOT_VERIFIED"
  | "KILL_SWITCH_ENABLED"
  | "WORKER_PAUSED"
  | "PER_COMMAND_CAP_EXCEEDED"
  | "PER_ACCOUNT_DAILY_CAP_EXCEEDED"
  | "GLOBAL_DAILY_CAP_EXCEEDED";

export type LiveValidationInput = {
  readonly account: DryRunAccountControls;
  readonly commandAmount: CoinAmount;
  readonly accountSpentToday: CoinAmount;
  readonly globalSpentToday: CoinAmount;
  readonly caps: LowValueLiveCaps;
  readonly dryRun: boolean;
  readonly liveTradingEnabled: boolean;
  readonly transactionContract: ExternalContractEvaluation;
};

export type LiveValidationDecision =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly reason: LiveValidationBlockReason };

export function evaluateLiveCommand(input: LiveValidationInput): LiveValidationDecision {
  if (!input.liveTradingEnabled) {
    return { kind: "blocked", reason: "LIVE_TRADING_DISABLED" };
  }
  if (input.dryRun) {
    return { kind: "blocked", reason: "DRY_RUN_ENABLED" };
  }
  if (input.transactionContract.status !== "VERIFIED" || input.transactionContract.issues.length > 0) {
    return { kind: "blocked", reason: "CONTRACT_NOT_VERIFIED" };
  }
  if (input.account.killSwitch) {
    return { kind: "blocked", reason: "KILL_SWITCH_ENABLED" };
  }
  if (input.account.paused) {
    return { kind: "blocked", reason: "WORKER_PAUSED" };
  }
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
