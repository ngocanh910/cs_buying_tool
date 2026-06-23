import { coinAmount } from "@csgoempire-bot/domain";
import type { AppEnv } from "@csgoempire-bot/config";
import type { ExternalContractEvaluation } from "@csgoempire-bot/contracts";
import { describe, expect, it } from "vitest";
import { evaluateProductionPreflight } from "./production-preflight.js";
import type { ProductionPreflightInput, ProductionPreflightIssue } from "./production-preflight.js";

const productionLiveEnv: AppEnv = {
  NODE_ENV: "production",
  APP_MODE: "live",
  TRADING_MODE: "live",
  LIVE_TRADING_ENABLED: true,
  LOG_LEVEL: "info"
};

const verifiedContract: ExternalContractEvaluation = {
  status: "VERIFIED",
  issues: []
};

const unverifiedContract: ExternalContractEvaluation = {
  status: "UNVERIFIED_EXTERNAL_CONTRACT",
  issues: ["REGISTRY_STATUS_NOT_VERIFIED"]
};

function readyInput(): ProductionPreflightInput {
  return {
    env: productionLiveEnv,
    transactionContracts: [verifiedContract],
    caps: {
      perCommand: coinAmount(1),
      perAccountDaily: coinAmount(5),
      globalDaily: coinAmount(10)
    },
    dryRunReplayReviewed: true,
    loadTestSimulatedAccounts: 20,
    chaosTestsPassed: true,
    backupRestoreTested: true,
    alertsConfigured: true,
    secretScanPassed: true,
    legalApprovalDocumented: true
  };
}

type BlockingCase = {
  readonly name: string;
  readonly override: Partial<ProductionPreflightInput>;
  readonly issue: ProductionPreflightIssue;
};

describe("evaluateProductionPreflight", () => {
  const blockingCases: readonly BlockingCase[] = [
    {
      name: "not running in production",
      override: { env: { ...productionLiveEnv, NODE_ENV: "development" } },
      issue: "PRODUCTION_ENV_REQUIRED"
    },
    {
      name: "live mode is not explicit",
      override: { env: { ...productionLiveEnv, APP_MODE: "simulation" } },
      issue: "LIVE_MODE_REQUIRED"
    },
    {
      name: "live trading flag is disabled",
      override: { env: { ...productionLiveEnv, LIVE_TRADING_ENABLED: false } },
      issue: "LIVE_TRADING_FLAG_REQUIRED"
    },
    {
      name: "transaction contract is unverified",
      override: { transactionContracts: [unverifiedContract] },
      issue: "UNVERIFIED_TRANSACTION_CONTRACT"
    },
    {
      name: "no transaction contract is registered",
      override: { transactionContracts: [] },
      issue: "NO_TRANSACTION_CONTRACT_REGISTERED"
    },
    {
      name: "value caps are missing",
      override: { caps: undefined },
      issue: "VALUE_CAPS_REQUIRED"
    },
    {
      name: "dry-run replay has not been reviewed",
      override: { dryRunReplayReviewed: false },
      issue: "DRY_RUN_REPLAY_NOT_REVIEWED"
    },
    {
      name: "fewer than 20 simulated accounts were load tested",
      override: { loadTestSimulatedAccounts: 19 },
      issue: "LOAD_TEST_NOT_SUFFICIENT"
    },
    {
      name: "chaos tests have not passed",
      override: { chaosTestsPassed: false },
      issue: "CHAOS_TESTS_NOT_PASSED"
    },
    {
      name: "backup and restore has not been tested",
      override: { backupRestoreTested: false },
      issue: "BACKUP_RESTORE_NOT_TESTED"
    },
    {
      name: "alerts are not configured",
      override: { alertsConfigured: false },
      issue: "ALERTS_NOT_CONFIGURED"
    },
    {
      name: "secret scan has not passed",
      override: { secretScanPassed: false },
      issue: "SECRET_SCAN_NOT_PASSED"
    },
    {
      name: "legal approval is missing",
      override: { legalApprovalDocumented: false },
      issue: "LEGAL_APPROVAL_MISSING"
    }
  ];

  it.each(blockingCases)("blocks release when $name", ({ override, issue }) => {
    expect(evaluateProductionPreflight({ ...readyInput(), ...override })).toEqual({
      kind: "blocked",
      issues: [issue]
    });
  });

  it("reports every blocking issue instead of stopping at the first one", () => {
    expect(
      evaluateProductionPreflight({
        ...readyInput(),
        env: {
          ...productionLiveEnv,
          NODE_ENV: "development",
          APP_MODE: "simulation",
          TRADING_MODE: "dry_run",
          LIVE_TRADING_ENABLED: false
        },
        transactionContracts: [unverifiedContract],
        caps: undefined,
        dryRunReplayReviewed: false,
        loadTestSimulatedAccounts: 0,
        chaosTestsPassed: false,
        backupRestoreTested: false,
        alertsConfigured: false,
        secretScanPassed: false,
        legalApprovalDocumented: false
      })
    ).toEqual({
      kind: "blocked",
      issues: [
        "PRODUCTION_ENV_REQUIRED",
        "LIVE_MODE_REQUIRED",
        "LIVE_TRADING_FLAG_REQUIRED",
        "UNVERIFIED_TRANSACTION_CONTRACT",
        "VALUE_CAPS_REQUIRED",
        "DRY_RUN_REPLAY_NOT_REVIEWED",
        "LOAD_TEST_NOT_SUFFICIENT",
        "CHAOS_TESTS_NOT_PASSED",
        "BACKUP_RESTORE_NOT_TESTED",
        "ALERTS_NOT_CONFIGURED",
        "SECRET_SCAN_NOT_PASSED",
        "LEGAL_APPROVAL_MISSING"
      ]
    });
  });

  it("allows release only when every production hardening gate passes", () => {
    expect(evaluateProductionPreflight(readyInput())).toEqual({ kind: "ready" });
  });
});
