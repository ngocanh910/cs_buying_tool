import { describe, expect, it } from "vitest";
import { accountId } from "@csgoempire-bot/domain";
import { reconstructWorkerRuntime, type WorkerSnapshot } from "./lifecycle.js";

describe("worker lifecycle reconstruction", () => {
  it("forces dry-run paused state after an unclean shutdown", () => {
    const snapshot: WorkerSnapshot = {
      accountId: accountId("account-1"),
      previousState: "RUNNING",
      shutdownClean: false,
      persistedDryRun: false,
      liveTradingEnabled: true,
      reconciliationCommandCount: 1
    };

    expect(reconstructWorkerRuntime(snapshot)).toEqual({
      accountId: accountId("account-1"),
      state: "PAUSED",
      dryRun: true,
      liveTradingEnabled: false,
      reconciliationRequired: true
    });
  });

  it("restores stopped state safely after a clean shutdown", () => {
    const snapshot: WorkerSnapshot = {
      accountId: accountId("account-1"),
      previousState: "STOPPED",
      shutdownClean: true,
      persistedDryRun: true,
      liveTradingEnabled: false,
      reconciliationCommandCount: 0
    };

    expect(reconstructWorkerRuntime(snapshot).state).toBe("STOPPED");
    expect(reconstructWorkerRuntime(snapshot).dryRun).toBe(true);
  });

  it("does not restore live trading unless verified external contracts are enabled", () => {
    const snapshot: WorkerSnapshot = {
      accountId: accountId("account-1"),
      previousState: "RUNNING",
      shutdownClean: true,
      persistedDryRun: false,
      liveTradingEnabled: true,
      verifiedExternalContractsEnabled: false,
      reconciliationCommandCount: 0
    };

    expect(reconstructWorkerRuntime(snapshot)).toMatchObject({
      state: "PAUSED",
      dryRun: true,
      liveTradingEnabled: false
    });
  });
});
