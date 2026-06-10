import { describe, expect, it } from "vitest";
import {
  advanceAuctionWatcher,
  advancePurchaseTrade,
  advanceWorker,
  applyAuctionEvent,
  applyFixedPriceEvent,
  calculateMarginPct,
  calculateMaxBid,
  accountId,
  auctionId,
  assetId,
  coinAmount,
  decideBid,
  decideSniping,
  itemId,
  percentage,
  steamId64,
  tradeOfferId,
  verifyTradeOffer
} from "./index.js";

const now = new Date("2026-06-10T00:00:00.000Z");

describe("value objects and calculations", () => {
  it("validates branded identifiers at construction time", () => {
    expect(accountId("account-1")).toBe("account-1");
    expect(itemId("item-1")).toBe("item-1");
    expect(assetId("asset-1")).toBe("asset-1");
    expect(steamId64("76561198000000000")).toBe("76561198000000000");
    expect(() => accountId("")).toThrow("AccountId");
    expect(() => steamId64("not-a-steamid")).toThrow("SteamId64");
  });

  it("keeps coin amount as an integer non-negative value", () => {
    expect(coinAmount(10).value).toBe(10);
    expect(() => coinAmount(-1)).toThrow("CoinAmount");
    expect(() => coinAmount(1.2)).toThrow("CoinAmount");
  });

  it("calculates margin percentage from integer coin amounts", () => {
    const margin = calculateMarginPct(coinAmount(1000), coinAmount(700));
    expect(margin.basisPoints).toBe(3000);
  });

  it("calculates max bid with deterministic floor rounding", () => {
    expect(calculateMaxBid(coinAmount(999), percentage(12.5)).value).toBe(874);
  });
});

describe("sniping eligibility", () => {
  const baseConfig = {
    enabled: true,
    allowedCategories: ["rifle"],
    minPrice: coinAmount(100),
    maxPrice: coinAmount(1000),
    targetMarginPct: percentage(20),
    minReferenceListings: 3,
    maxReferenceAgeMs: 60_000,
    maxItemAgeMs: 30_000
  };

  const item = {
    id: itemId("item-1"),
    name: "AK-47 Test",
    category: "rifle",
    listedPrice: coinAmount(700),
    seenAt: now
  };

  const reference = {
    marketName: "AK-47 Test",
    price: coinAmount(1000),
    listingCount: 5,
    capturedAt: now,
    reliability: "reliable" as const
  };

  it("does not run when module is disabled", () => {
    const decision = decideSniping({ item, reference, config: { ...baseConfig, enabled: false }, now });
    expect(decision.kind).toBe("skip");
    if (decision.kind !== "skip") throw new Error("expected skip decision");
    expect(decision.reason).toBe("MODULE_DISABLED");
  });

  it("does not buy when reference price is not reliable enough", () => {
    const decision = decideSniping({
      item,
      reference: { ...reference, listingCount: 1, reliability: "unreliable" },
      config: baseConfig,
      now
    });
    expect(decision.kind).toBe("skip");
    if (decision.kind !== "skip") throw new Error("expected skip decision");
    expect(decision.reason).toBe("REFERENCE_UNRELIABLE");
  });

  it("requires allowed category, price range, fresh data, listing count, and target margin", () => {
    const decision = decideSniping({ item, reference, config: baseConfig, now });
    expect(decision.kind).toBe("buy");
    if (decision.kind !== "buy") throw new Error("expected buy decision");
    expect(decision.maxPay.value).toBe(700);
  });

  it("does not buy when item snapshot is stale", () => {
    const decision = decideSniping({
      item: { ...item, seenAt: new Date("2026-06-09T23:59:00.000Z") },
      reference,
      config: baseConfig,
      now
    });
    expect(decision.kind).toBe("skip");
    if (decision.kind !== "skip") throw new Error("expected skip decision");
    expect(decision.reason).toBe("ITEM_STALE");
  });
});

describe("bid decision", () => {
  const auction = {
    id: auctionId("auction-1"),
    itemId: itemId("item-1"),
    category: "rifle",
    currentBid: coinAmount(800),
    bidStep: coinAmount(25),
    endsAt: new Date("2026-06-10T00:00:05.000Z"),
    status: "active" as const,
    highestBidderAccountId: undefined,
    updatedAt: now,
    version: 1
  };

  const context = {
    auction,
    reference: {
      marketName: "AK-47 Test",
      price: coinAmount(1000),
      listingCount: 5,
      capturedAt: now,
      reliability: "reliable" as const
    },
    config: {
      enabled: true,
      stopThresholdPct: percentage(10),
      snipeWindowMs: 10_000,
      maxAuctionAgeMs: 60_000
    },
    account: {
      accountId: accountId("account-1"),
      balance: coinAmount(1000),
      paused: false,
      killSwitch: false
    },
    now
  };

  it("never bids above max bid", () => {
    const decision = decideBid({
      ...context,
      auction: { ...auction, currentBid: coinAmount(890), bidStep: coinAmount(25) }
    });
    expect(decision.kind).toBe("skip");
    if (decision.kind !== "skip") throw new Error("expected skip decision");
    expect(decision.reason).toBe("WOULD_EXCEED_MAX_BID");
  });

  it("bids only when active, inside window, not leading, funded, unpaused, and fresh", () => {
    const decision = decideBid(context);
    expect(decision.kind).toBe("bid");
    if (decision.kind !== "bid") throw new Error("expected bid decision");
    expect(decision.amount.value).toBe(825);
  });

  it("kill switch prevents every new command", () => {
    const decision = decideBid({ ...context, account: { ...context.account, killSwitch: true } });
    expect(decision.kind).toBe("skip");
    if (decision.kind !== "skip") throw new Error("expected skip decision");
    expect(decision.reason).toBe("KILL_SWITCH_ENABLED");
  });
});

describe("trade offer verification", () => {
  const pending = {
    purchaseId: "purchase-1",
    expectedPartnerSteamId64: steamId64("76561198000000000"),
    expectedAssetIds: [assetId("asset-1")],
    createdAt: now,
    processed: false
  };

  const offer = {
    tradeOfferId: tradeOfferId("offer-1"),
    partnerSteamId64: steamId64("76561198000000000"),
    itemsToGive: [],
    itemsToReceive: [{ assetId: assetId("asset-1") }],
    expiresAt: new Date("2026-06-10T00:10:00.000Z"),
    active: true
  };

  it("defaults to reject or review when verification data is missing", () => {
    expect(verifyTradeOffer({ pendingPurchase: undefined, offer, now }).action).not.toBe("accept");
  });

  it("never accepts a trade that asks the user to give items", () => {
    const result = verifyTradeOffer({
      pendingPurchase: pending,
      offer: { ...offer, itemsToGive: [{ assetId: assetId("user-asset") }] },
      now
    });
    expect(result.action).toBe("reject");
  });

  it("never accepts when expected asset differs", () => {
    const result = verifyTradeOffer({
      pendingPurchase: pending,
      offer: { ...offer, itemsToReceive: [{ assetId: assetId("asset-2") }] },
      now
    });
    expect(result.action).toBe("reject");
  });

  it("accepts only when every verified condition matches", () => {
    const result = verifyTradeOffer({ pendingPurchase: pending, offer, now });
    expect(result.action).toBe("accept");
  });
});

describe("state machines", () => {
  it("rejects invalid worker transition", () => {
    expect(() => advanceWorker("INIT", "RUNNING")).toThrow("Invalid worker transition");
  });

  it("accepts valid watcher and purchase transitions", () => {
    expect(advanceAuctionWatcher("DISCOVERED", "WATCHING")).toBe("WATCHING");
    expect(advancePurchaseTrade("TRADE_VERIFIED", "TRADE_ACCEPTED")).toBe("TRADE_ACCEPTED");
  });
});

describe("event deduplication", () => {
  it("does not create duplicate fixed-price commands for duplicate events", () => {
    const seen = new Set<string>();
    const first = applyFixedPriceEvent(seen, "event-1");
    const duplicate = applyFixedPriceEvent(seen, "event-1");
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
  });

  it("does not regress auction state on old or duplicate events", () => {
    const initial = { auctionId: auctionId("auction-1"), version: 2, endsAt: new Date("2026-06-10T00:01:00.000Z") };
    const result = applyAuctionEvent(initial, {
      auctionId: auctionId("auction-1"),
      version: 1,
      endsAt: new Date("2026-06-10T00:00:30.000Z")
    });
    expect(result).toEqual(initial);
  });
});
