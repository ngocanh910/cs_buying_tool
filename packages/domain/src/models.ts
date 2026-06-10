import type { AccountId, AssetId, AuctionId, CoinAmount, ItemId, Percentage, SteamId64, TradeOfferId } from "./value-objects.js";

export type ReferenceReliability = "reliable" | "unreliable";

export type MarketItem = {
  readonly id: ItemId;
  readonly name: string;
  readonly category: string;
  readonly listedPrice: CoinAmount;
  readonly seenAt: Date;
};

export type ReferencePrice = {
  readonly marketName: string;
  readonly price: CoinAmount;
  readonly listingCount: number;
  readonly capturedAt: Date;
  readonly reliability: ReferenceReliability;
};

export type AuctionSnapshot = {
  readonly id: AuctionId;
  readonly itemId: ItemId;
  readonly category: string;
  readonly currentBid: CoinAmount;
  readonly bidStep: CoinAmount;
  readonly endsAt: Date;
  readonly status: "active" | "ended";
  readonly highestBidderAccountId: AccountId | undefined;
  readonly updatedAt: Date;
  readonly version: number;
};

export type PendingPurchase = {
  readonly purchaseId: string;
  readonly expectedPartnerSteamId64: SteamId64;
  readonly expectedAssetIds: readonly AssetId[];
  readonly createdAt: Date;
  readonly processed: boolean;
};

export type TradeOfferSnapshot = {
  readonly tradeOfferId: TradeOfferId;
  readonly partnerSteamId64: SteamId64;
  readonly itemsToGive: readonly { readonly assetId: AssetId }[];
  readonly itemsToReceive: readonly { readonly assetId: AssetId }[];
  readonly expiresAt: Date;
  readonly active: boolean;
};

export type AccountConfig = {
  readonly accountId: AccountId;
  readonly liveTradingEnabled: boolean;
  readonly dryRun: boolean;
};

export type SnipingConfig = {
  readonly enabled: boolean;
  readonly allowedCategories: readonly string[];
  readonly minPrice: CoinAmount;
  readonly maxPrice: CoinAmount;
  readonly targetMarginPct: Percentage;
  readonly minReferenceListings: number;
  readonly maxReferenceAgeMs: number;
  readonly maxItemAgeMs: number;
};

export type BiddingConfig = {
  readonly enabled: boolean;
  readonly stopThresholdPct: Percentage;
  readonly snipeWindowMs: number;
  readonly maxAuctionAgeMs: number;
};
