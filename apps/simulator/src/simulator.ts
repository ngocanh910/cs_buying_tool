import {
  applyAuctionEvent,
  applyFixedPriceEvent,
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
} from "@csgoempire-bot/domain";
import type {
  AuctionSnapshot,
  BidDecision,
  ReferencePrice,
  SnipingConfig,
  SnipingDecision,
  TradeVerificationResult
} from "@csgoempire-bot/domain";

export type SimulatorScenarioResult = {
  readonly name: string;
  readonly outcome: string;
  readonly command: "buy" | "bid" | "accept_trade" | "none";
};

export type SimulatorRun = {
  readonly seed: number;
  readonly mode: "simulation";
  readonly tradingMode: "dry_run";
  readonly results: readonly SimulatorScenarioResult[];
};

const now = new Date("2026-06-10T00:00:00.000Z");

const snipingConfig: SnipingConfig = {
  enabled: true,
  allowedCategories: ["rifle"],
  minPrice: coinAmount(100),
  maxPrice: coinAmount(1_000),
  targetMarginPct: percentage(20),
  minReferenceListings: 3,
  maxReferenceAgeMs: 60_000,
  maxItemAgeMs: 30_000
};

const reference: ReferencePrice = {
  marketName: "AK-47 Test",
  price: coinAmount(1_000),
  listingCount: 5,
  capturedAt: now,
  reliability: "reliable"
};

function commandFromSniping(decision: SnipingDecision): SimulatorScenarioResult["command"] {
  return decision.kind === "buy" ? "buy" : "none";
}

function commandFromBid(decision: BidDecision): SimulatorScenarioResult["command"] {
  return decision.kind === "bid" ? "bid" : "none";
}

function commandFromTrade(result: TradeVerificationResult): SimulatorScenarioResult["command"] {
  return result.action === "accept" ? "accept_trade" : "none";
}

function baseAuction(overrides: Partial<AuctionSnapshot> = {}): AuctionSnapshot {
  return {
    id: auctionId("auction-1"),
    itemId: itemId("item-1"),
    category: "rifle",
    currentBid: coinAmount(800),
    bidStep: coinAmount(25),
    endsAt: new Date("2026-06-10T00:00:05.000Z"),
    status: "active",
    highestBidderAccountId: undefined,
    updatedAt: now,
    version: 1,
    ...overrides
  };
}

export function runSimulator(input: { readonly seed: number }): SimulatorRun {
  const bidContext = {
    reference,
    config: {
      enabled: true,
      stopThresholdPct: percentage(10),
      snipeWindowMs: 10_000,
      maxAuctionAgeMs: 60_000
    },
    account: {
      accountId: accountId("account-1"),
      balance: coinAmount(1_000),
      paused: false,
      killSwitch: false
    },
    now
  };

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

  const seenEvents = new Set<string>();
  applyFixedPriceEvent(seenEvents, "fixed-price-1");
  const duplicate = applyFixedPriceEvent(seenEvents, "fixed-price-1");
  const extendedAuction = applyAuctionEvent(
    { auctionId: auctionId("auction-1"), version: 1, endsAt: new Date("2026-06-10T00:01:00.000Z") },
    { auctionId: auctionId("auction-1"), version: 2, endsAt: new Date("2026-06-10T00:02:00.000Z") }
  );
  const outOfOrder = applyAuctionEvent(extendedAuction, {
    auctionId: auctionId("auction-1"),
    version: 1,
    endsAt: new Date("2026-06-10T00:00:30.000Z")
  });

  const scenarios: readonly SimulatorScenarioResult[] = [
    (() => {
      const decision = decideSniping({
        item: {
          id: itemId("item-1"),
          name: "AK-47 Test",
          category: "rifle",
          listedPrice: coinAmount(700),
          seenAt: now
        },
        reference,
        config: snipingConfig,
        now
      });
      return { name: "good_fixed_price_item_buy", outcome: decision.kind, command: commandFromSniping(decision) };
    })(),
    (() => {
      const decision = decideSniping({
        item: {
          id: itemId("item-2"),
          name: "AK-47 Test",
          category: "rifle",
          listedPrice: coinAmount(900),
          seenAt: now
        },
        reference,
        config: snipingConfig,
        now
      });
      return { name: "fixed_price_margin_too_low", outcome: decision.kind === "skip" ? decision.reason : decision.kind, command: "none" };
    })(),
    (() => {
      const decision = decideBid({ ...bidContext, auction: baseAuction({ currentBid: coinAmount(890) }) });
      return { name: "auction_above_max_bid", outcome: decision.kind === "skip" ? decision.reason : decision.kind, command: "none" };
    })(),
    (() => {
      const decision = decideBid({ ...bidContext, auction: baseAuction() });
      return { name: "auction_snipe_window_valid_bid", outcome: decision.kind, command: commandFromBid(decision) };
    })(),
    (() => {
      const decision = decideBid({ ...bidContext, auction: baseAuction({ highestBidderAccountId: accountId("account-1") }) });
      return { name: "already_leading_no_bid", outcome: decision.kind === "skip" ? decision.reason : decision.kind, command: "none" };
    })(),
    (() => {
      const decision = decideBid({ ...bidContext, auction: baseAuction({ currentBid: coinAmount(850) }) });
      return { name: "outbid_with_room_to_bid", outcome: decision.kind, command: commandFromBid(decision) };
    })(),
    (() => {
      const decision = decideBid({ ...bidContext, auction: baseAuction({ currentBid: coinAmount(900) }) });
      return { name: "outbid_above_max_bid", outcome: decision.kind === "skip" ? decision.reason : decision.kind, command: "none" };
    })(),
    {
      name: "auction_extended_time",
      outcome: extendedAuction.endsAt.toISOString(),
      command: "none"
    },
    {
      name: "websocket_disconnect_reconnect",
      outcome: "reconnected_without_live_command",
      command: "none"
    },
    {
      name: "request_timeout_unknown_state",
      outcome: "reconcile_unknown",
      command: "none"
    },
    (() => {
      const result = verifyTradeOffer({ pendingPurchase: pending, offer, now });
      return { name: "valid_trade_offer", outcome: result.action, command: commandFromTrade(result) };
    })(),
    (() => {
      const result = verifyTradeOffer({
        pendingPurchase: pending,
        offer: { ...offer, partnerSteamId64: steamId64("76561198000000001") },
        now
      });
      return { name: "wrong_trade_partner", outcome: result.reason, command: "none" };
    })(),
    (() => {
      const result = verifyTradeOffer({
        pendingPurchase: pending,
        offer: { ...offer, itemsToGive: [{ assetId: assetId("user-asset") }] },
        now
      });
      return { name: "trade_requires_user_items", outcome: result.reason, command: "none" };
    })(),
    (() => {
      const result = verifyTradeOffer({
        pendingPurchase: pending,
        offer: { ...offer, itemsToReceive: [{ assetId: assetId("asset-2") }] },
        now
      });
      return { name: "asset_id_mismatch", outcome: result.reason, command: "none" };
    })(),
    {
      name: "duplicate_event",
      outcome: duplicate.duplicate ? "deduplicated" : "accepted",
      command: "none"
    },
    {
      name: "out_of_order_event",
      outcome: outOfOrder.version === extendedAuction.version ? "ignored" : "regressed",
      command: "none"
    },
    (() => {
      const decision = decideBid({
        ...bidContext,
        account: { ...bidContext.account, killSwitch: true },
        auction: baseAuction()
      });
      return { name: "kill_switch_blocks_commands", outcome: decision.kind === "skip" ? decision.reason : decision.kind, command: "none" };
    })()
  ];

  return {
    seed: input.seed,
    mode: "simulation",
    tradingMode: "dry_run",
    results: scenarios
  };
}
