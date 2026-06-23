import type { AppEnv } from "@csgoempire-bot/config";
import type { ExternalContractEvaluation } from "@csgoempire-bot/contracts";
import type { LowValueLiveCaps } from "./live-validation-gate.js";

const MIN_LOAD_TEST_SIMULATED_ACCOUNTS = 20;

export type ProductionPreflightIssue =
  | "PRODUCTION_ENV_REQUIRED"
  | "LIVE_MODE_REQUIRED"
  | "LIVE_TRADING_FLAG_REQUIRED"
  | "NO_TRANSACTION_CONTRACT_REGISTERED"
  | "UNVERIFIED_TRANSACTION_CONTRACT"
  | "VALUE_CAPS_REQUIRED"
  | "DRY_RUN_REPLAY_NOT_REVIEWED"
  | "LOAD_TEST_NOT_SUFFICIENT"
  | "CHAOS_TESTS_NOT_PASSED"
  | "BACKUP_RESTORE_NOT_TESTED"
  | "ALERTS_NOT_CONFIGURED"
  | "SECRET_SCAN_NOT_PASSED"
  | "LEGAL_APPROVAL_MISSING";

export type ProductionPreflightInput = {
  readonly env: AppEnv;
  readonly transactionContracts: readonly ExternalContractEvaluation[];
  readonly caps: LowValueLiveCaps | undefined;
  readonly dryRunReplayReviewed: boolean;
  readonly loadTestSimulatedAccounts: number;
  readonly chaosTestsPassed: boolean;
  readonly backupRestoreTested: boolean;
  readonly alertsConfigured: boolean;
  readonly secretScanPassed: boolean;
  readonly legalApprovalDocumented: boolean;
};

export type ProductionPreflightDecision =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly ProductionPreflightIssue[] };

export function evaluateProductionPreflight(input: ProductionPreflightInput): ProductionPreflightDecision {
  const issues: ProductionPreflightIssue[] = [];
  const addIssueWhen = (condition: boolean, issue: ProductionPreflightIssue): void => {
    if (condition) {
      issues.push(issue);
    }
  };

  addIssueWhen(input.env.NODE_ENV !== "production", "PRODUCTION_ENV_REQUIRED");
  addIssueWhen(input.env.APP_MODE !== "live" || input.env.TRADING_MODE !== "live", "LIVE_MODE_REQUIRED");
  addIssueWhen(!input.env.LIVE_TRADING_ENABLED, "LIVE_TRADING_FLAG_REQUIRED");
  if (input.transactionContracts.length === 0) {
    issues.push("NO_TRANSACTION_CONTRACT_REGISTERED");
  } else if (input.transactionContracts.some((contract) => contract.status !== "VERIFIED" || contract.issues.length > 0)) {
    issues.push("UNVERIFIED_TRANSACTION_CONTRACT");
  }
  addIssueWhen(input.caps === undefined, "VALUE_CAPS_REQUIRED");
  addIssueWhen(!input.dryRunReplayReviewed, "DRY_RUN_REPLAY_NOT_REVIEWED");
  addIssueWhen(input.loadTestSimulatedAccounts < MIN_LOAD_TEST_SIMULATED_ACCOUNTS, "LOAD_TEST_NOT_SUFFICIENT");
  addIssueWhen(!input.chaosTestsPassed, "CHAOS_TESTS_NOT_PASSED");
  addIssueWhen(!input.backupRestoreTested, "BACKUP_RESTORE_NOT_TESTED");
  addIssueWhen(!input.alertsConfigured, "ALERTS_NOT_CONFIGURED");
  addIssueWhen(!input.secretScanPassed, "SECRET_SCAN_NOT_PASSED");
  addIssueWhen(!input.legalApprovalDocumented, "LEGAL_APPROVAL_MISSING");

  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}
