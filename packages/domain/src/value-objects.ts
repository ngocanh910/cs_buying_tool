import { z } from "zod";

export const UNVERIFIED_EXTERNAL_CONTRACT = "UNVERIFIED_EXTERNAL_CONTRACT";

type Brand<TBase, TBrand extends string> = TBase & { readonly __brand: TBrand };

export type CoinAmount = {
  readonly value: number;
};

export type Percentage = {
  readonly basisPoints: number;
};

export type AccountId = Brand<string, "AccountId">;
export type SteamId64 = Brand<string, "SteamId64">;
export type ItemId = Brand<string, "ItemId">;
export type AuctionId = Brand<string, "AuctionId">;
export type TradeOfferId = Brand<string, "TradeOfferId">;
export type AssetId = Brand<string, "AssetId">;

export const coinAmountSchema = z
  .number()
  .int()
  .nonnegative()
  .transform((value): CoinAmount => ({ value }));

export const percentageSchema = z
  .number()
  .min(0)
  .max(100)
  .transform((value): Percentage => ({ basisPoints: Math.round(value * 100) }));

function nonEmptyId<TBrand extends string>(value: string, label: TBrand): Brand<string, TBrand> {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value as Brand<string, TBrand>;
}

export function accountId(value: string): AccountId {
  return nonEmptyId(value, "AccountId");
}

export function itemId(value: string): ItemId {
  return nonEmptyId(value, "ItemId");
}

export function auctionId(value: string): AuctionId {
  return nonEmptyId(value, "AuctionId");
}

export function tradeOfferId(value: string): TradeOfferId {
  return nonEmptyId(value, "TradeOfferId");
}

export function assetId(value: string): AssetId {
  return nonEmptyId(value, "AssetId");
}

export function steamId64(value: string): SteamId64 {
  if (!/^\d{17}$/.test(value)) {
    throw new Error("SteamId64 must be a 17 digit identifier");
  }
  return value as SteamId64;
}

export function coinAmount(value: number): CoinAmount {
  const parsed = coinAmountSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("CoinAmount must be an integer non-negative value");
  }
  return parsed.data;
}

export function percentage(value: number): Percentage {
  const parsed = percentageSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Percentage must be between 0 and 100");
  }
  return parsed.data;
}

export function calculateMarginPct(referencePrice: CoinAmount, listedPrice: CoinAmount): Percentage {
  if (referencePrice.value <= 0) {
    return { basisPoints: 0 };
  }
  const basisPoints = Math.floor(((referencePrice.value - listedPrice.value) * 10_000) / referencePrice.value);
  return { basisPoints: Math.max(0, basisPoints) };
}

export function calculateMaxBid(referencePrice: CoinAmount, stopThresholdPct: Percentage): CoinAmount {
  const raw = Math.floor((referencePrice.value * (10_000 - stopThresholdPct.basisPoints)) / 10_000);
  return coinAmount(Math.max(0, raw));
}
