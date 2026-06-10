import type { AccountId, WorkerState } from "@csgoempire-bot/domain";

export type WorkerSnapshot = {
  readonly accountId: AccountId;
  readonly previousState: WorkerState;
  readonly shutdownClean: boolean;
  readonly persistedDryRun: boolean;
  readonly liveTradingEnabled: boolean;
  readonly verifiedExternalContractsEnabled?: boolean;
  readonly reconciliationCommandCount: number;
};

export type WorkerRuntime = {
  readonly accountId: AccountId;
  readonly state: WorkerState;
  readonly dryRun: boolean;
  readonly liveTradingEnabled: boolean;
  readonly reconciliationRequired: boolean;
};

export function reconstructWorkerRuntime(snapshot: WorkerSnapshot): WorkerRuntime {
  const reconciliationRequired = snapshot.reconciliationCommandCount > 0;
  const unsafeToRunLive =
    snapshot.liveTradingEnabled && !snapshot.persistedDryRun && snapshot.verifiedExternalContractsEnabled !== true;

  if (!snapshot.shutdownClean || reconciliationRequired || unsafeToRunLive) {
    return {
      accountId: snapshot.accountId,
      state: "PAUSED",
      dryRun: true,
      liveTradingEnabled: false,
      reconciliationRequired
    };
  }

  return {
    accountId: snapshot.accountId,
    state: snapshot.previousState,
    dryRun: snapshot.persistedDryRun,
    liveTradingEnabled:
      snapshot.liveTradingEnabled && !snapshot.persistedDryRun && snapshot.verifiedExternalContractsEnabled === true,
    reconciliationRequired: false
  };
}
