import { calculateMarginPct, calculateMaxBid, coinAmount } from "./value-objects.js";
import type { AccountId, CoinAmount, Percentage } from "./value-objects.js";
import type { AuctionSnapshot, BiddingConfig, MarketItem, ReferencePrice, SnipingConfig } from "./models.js";

export type SnipingDecision =
  | { readonly kind: "buy"; readonly maxPay: CoinAmount; readonly marginPct: Percentage }
  | {
      readonly kind: "skip";
      readonly reason:
        | "MODULE_DISABLED"
        | "CATEGORY_NOT_ALLOWED"
        | "PRICE_OUT_OF_RANGE"
        | "REFERENCE_MISSING"
        | "REFERENCE_UNRELIABLE"
        | "REFERENCE_STALE"
        | "ITEM_STALE"
        | "MARGIN_TOO_LOW";
    };

export function decideSniping(input: {
  readonly item: MarketItem;
  readonly reference: ReferencePrice | undefined;
  readonly config: SnipingConfig;
  readonly now: Date;
}): SnipingDecision {
  const { item, reference, config, now } = input;
  if (!config.enabled) return { kind: "skip", reason: "MODULE_DISABLED" };
  if (!config.allowedCategories.includes(item.category)) return { kind: "skip", reason: "CATEGORY_NOT_ALLOWED" };
  if (item.listedPrice.value < config.minPrice.value || item.listedPrice.value > config.maxPrice.value) {
    return { kind: "skip", reason: "PRICE_OUT_OF_RANGE" };
  }
  if (reference === undefined) return { kind: "skip", reason: "REFERENCE_MISSING" };
  if (reference.reliability !== "reliable" || reference.listingCount < config.minReferenceListings) {
    return { kind: "skip", reason: "REFERENCE_UNRELIABLE" };
  }
  if (now.getTime() - reference.capturedAt.getTime() > config.maxReferenceAgeMs) {
    return { kind: "skip", reason: "REFERENCE_STALE" };
  }
  if (now.getTime() - item.seenAt.getTime() > config.maxItemAgeMs) {
    return { kind: "skip", reason: "ITEM_STALE" };
  }
  const marginPct = calculateMarginPct(reference.price, item.listedPrice);
  if (marginPct.basisPoints < config.targetMarginPct.basisPoints) {
    return { kind: "skip", reason: "MARGIN_TOO_LOW" };
  }
  return { kind: "buy", maxPay: item.listedPrice, marginPct };
}

export type BidDecision =
  | { readonly kind: "bid"; readonly amount: CoinAmount; readonly maxBid: CoinAmount }
  | {
      readonly kind: "skip";
      readonly reason:
        | "MODULE_DISABLED"
        | "AUCTION_NOT_ACTIVE"
        | "NOT_IN_SNIPE_WINDOW"
        | "ALREADY_LEADING"
        | "WOULD_EXCEED_MAX_BID"
        | "INSUFFICIENT_BALANCE"
        | "WORKER_PAUSED"
        | "KILL_SWITCH_ENABLED"
        | "AUCTION_STALE"
        | "REFERENCE_MISSING"
        | "REFERENCE_UNRELIABLE";
      readonly maxBid?: CoinAmount;
    };

export function decideBid(input: {
  readonly auction: AuctionSnapshot;
  readonly reference: ReferencePrice | undefined;
  readonly config: BiddingConfig;
  readonly account: {
    readonly accountId: AccountId;
    readonly balance: CoinAmount;
    readonly paused: boolean;
    readonly killSwitch: boolean;
  };
  readonly now: Date;
}): BidDecision {
  const { auction, reference, config, account, now } = input;
  if (!config.enabled) return { kind: "skip", reason: "MODULE_DISABLED" };
  if (account.killSwitch) return { kind: "skip", reason: "KILL_SWITCH_ENABLED" };
  if (account.paused) return { kind: "skip", reason: "WORKER_PAUSED" };
  if (auction.status !== "active") return { kind: "skip", reason: "AUCTION_NOT_ACTIVE" };
  if (now.getTime() - auction.updatedAt.getTime() > config.maxAuctionAgeMs) return { kind: "skip", reason: "AUCTION_STALE" };
  const msUntilEnd = auction.endsAt.getTime() - now.getTime();
  if (msUntilEnd < 0 || msUntilEnd > config.snipeWindowMs) return { kind: "skip", reason: "NOT_IN_SNIPE_WINDOW" };
  if (auction.highestBidderAccountId === account.accountId) return { kind: "skip", reason: "ALREADY_LEADING" };
  if (reference === undefined) return { kind: "skip", reason: "REFERENCE_MISSING" };
  if (reference.reliability !== "reliable") return { kind: "skip", reason: "REFERENCE_UNRELIABLE" };
  const maxBid = calculateMaxBid(reference.price, config.stopThresholdPct);
  const nextBid = coinAmount(auction.currentBid.value + auction.bidStep.value);
  if (nextBid.value > maxBid.value) return { kind: "skip", reason: "WOULD_EXCEED_MAX_BID", maxBid };
  if (account.balance.value < nextBid.value) return { kind: "skip", reason: "INSUFFICIENT_BALANCE", maxBid };
  return { kind: "bid", amount: nextBid, maxBid };
}
