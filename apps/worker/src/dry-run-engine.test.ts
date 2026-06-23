import { describe, expect, it } from "vitest";
import { accountId, auctionId, coinAmount, itemId, percentage } from "@csgoempire-bot/domain";
import { InMemoryCommandRepository, InMemoryControlPlaneStore } from "@csgoempire-bot/persistence";
import { resolveDryRunAccountControls, runAuctionDryRun, runFixedPriceDryRun } from "./dry-run-engine.js";
import type { Clock, EmpireMarketGateway, IdGenerator } from "@csgoempire-bot/contracts";

describe("dry-run decision engine", () => {
  it("resolves account controls from the shared control-plane store", async () => {
    const controlPlaneStore = new InMemoryControlPlaneStore();
    await controlPlaneStore.setGlobalKillSwitch(true);
    await controlPlaneStore.setAccountPaused(accountId("account-1"), true);

    const controls = await resolveDryRunAccountControls(controlPlaneStore, accountId("account-1"));

    expect(controls).toEqual({
      accountId: "account-1",
      paused: true,
      killSwitch: true
    });
  });

  it("persists proposed fixed-price buy commands without sending live buy", async () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const marketGateway: EmpireMarketGateway = {
      contractStatus: "UNVERIFIED_EXTERNAL_CONTRACT",
      getFixedPriceItems: () =>
        Promise.resolve([
          {
            id: itemId("item-1"),
            name: "AK-47 Test",
            category: "rifle",
            listedPrice: coinAmount(700),
            seenAt: now
          }
        ]),
      getReferencePrice: () =>
        Promise.resolve({
          marketName: "AK-47 Test",
          price: coinAmount(1000),
          listingCount: 5,
          capturedAt: now,
          reliability: "reliable"
        })
    };
    const commandRepository = new InMemoryCommandRepository({ now: () => now });
    const idGenerator: IdGenerator = {
      nextId: (prefix) => `${prefix}-1`
    };
    const clock: Clock = {
      now: () => now
    };

    const result = await runFixedPriceDryRun({
      account: {
        accountId: accountId("account-1"),
        paused: false,
        killSwitch: false
      },
      config: {
        enabled: true,
        allowedCategories: ["rifle"],
        minPrice: coinAmount(100),
        maxPrice: coinAmount(1000),
        targetMarginPct: percentage(20),
        minReferenceListings: 3,
        maxReferenceAgeMs: 60_000,
        maxItemAgeMs: 30_000
      },
      marketGateway,
      commandRepository,
      idGenerator,
      clock
    });

    expect(result.proposedCommands).toEqual(["dry-run-buy-1"]);
    await expect(commandRepository.find("dry-run-buy-1")).resolves.toMatchObject({
      status: "proposed",
      record: {
        dryRun: true,
        kind: "buy"
      }
    });
  });

  it("does not propose fixed-price buy commands while kill switch is enabled", async () => {
    let marketReads = 0;
    const now = new Date("2026-06-10T00:00:00.000Z");
    const marketGateway: EmpireMarketGateway = {
      contractStatus: "UNVERIFIED_EXTERNAL_CONTRACT",
      getFixedPriceItems: () => {
        marketReads += 1;
        return Promise.resolve([
          {
            id: itemId("item-1"),
            name: "AK-47 Test",
            category: "rifle",
            listedPrice: coinAmount(700),
            seenAt: now
          }
        ]);
      },
      getReferencePrice: () =>
        Promise.resolve({
          marketName: "AK-47 Test",
          price: coinAmount(1000),
          listingCount: 5,
          capturedAt: now,
          reliability: "reliable"
        })
    };

    const result = await runFixedPriceDryRun({
      account: {
        accountId: accountId("account-1"),
        paused: false,
        killSwitch: true
      },
      config: {
        enabled: true,
        allowedCategories: ["rifle"],
        minPrice: coinAmount(100),
        maxPrice: coinAmount(1000),
        targetMarginPct: percentage(20),
        minReferenceListings: 3,
        maxReferenceAgeMs: 60_000,
        maxItemAgeMs: 30_000
      },
      marketGateway,
      commandRepository: new InMemoryCommandRepository({ now: () => now }),
      idGenerator: { nextId: (prefix) => `${prefix}-1` },
      clock: { now: () => now }
    });

    expect(result).toEqual({
      proposedCommands: [],
      skippedItems: [],
      blockedReason: "KILL_SWITCH_ENABLED"
    });
    expect(marketReads).toBe(0);
  });

  it("persists proposed auction bid commands without sending live bid", async () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const commandRepository = new InMemoryCommandRepository({ now: () => now });
    const idGenerator: IdGenerator = {
      nextId: (prefix) => `${prefix}-1`
    };

    const result = await runAuctionDryRun({
      account: {
        accountId: accountId("account-1"),
        balance: coinAmount(1000),
        paused: false,
        killSwitch: false
      },
      auction: {
        id: auctionId("auction-1"),
        itemId: itemId("item-1"),
        category: "rifle",
        currentBid: coinAmount(800),
        bidStep: coinAmount(25),
        endsAt: new Date("2026-06-10T00:00:05.000Z"),
        status: "active",
        highestBidderAccountId: undefined,
        updatedAt: now,
        version: 1
      },
      reference: {
        marketName: "AK-47 Test",
        price: coinAmount(1000),
        listingCount: 5,
        capturedAt: now,
        reliability: "reliable"
      },
      config: {
        enabled: true,
        stopThresholdPct: percentage(10),
        snipeWindowMs: 10_000,
        maxAuctionAgeMs: 60_000
      },
      commandRepository,
      idGenerator,
      clock: { now: () => now }
    });

    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") {
      throw new Error("expected dry-run bid proposal");
    }
    expect(result.proposedCommandId).toBe("dry-run-bid-1");
    await expect(commandRepository.find("dry-run-bid-1")).resolves.toMatchObject({
      status: "proposed",
      record: {
        dryRun: true,
        kind: "bid"
      }
    });
  });
});
