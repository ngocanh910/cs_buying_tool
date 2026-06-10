import { describe, expect, it } from "vitest";
import { accountId } from "@csgoempire-bot/domain";
import type { CacheCoordinator, CommandRecord } from "./index.js";

describe("contract command records", () => {
  it("requires a correlation id for every external command record", () => {
    const command: CommandRecord = {
      commandId: "command-1",
      correlationId: "correlation-1",
      accountId: accountId("account-1"),
      kind: "bid",
      dryRun: true,
      createdAt: new Date("2026-06-10T00:00:00.000Z")
    };

    expect(command.correlationId).toBe("correlation-1");
  });
});

describe("cache coordination contract", () => {
  it("keeps Redis usage behind a narrow abstraction", async () => {
    const coordinator: CacheCoordinator = {
      acquireLease: () => Promise.resolve({ acquired: true, leaseId: "lease-1" }),
      releaseLease: () => Promise.resolve()
    };

    await expect(coordinator.acquireLease("worker:account-1", 30_000)).resolves.toEqual({
      acquired: true,
      leaseId: "lease-1"
    });
  });
});
