import type { PendingPurchase, TradeOfferSnapshot } from "./models.js";

export type TradeVerificationResult =
  | { readonly action: "accept"; readonly reason: "VERIFIED" }
  | {
      readonly action: "reject" | "manual_review";
      readonly reason:
        | "MISSING_PENDING_PURCHASE"
        | "PARTNER_MISMATCH"
        | "ITEMS_TO_GIVE_NOT_EMPTY"
        | "RECEIVE_COUNT_MISMATCH"
        | "ASSET_MISMATCH"
        | "OFFER_EXPIRED_OR_INACTIVE"
        | "PENDING_ALREADY_PROCESSED";
    };

export function verifyTradeOffer(input: {
  readonly pendingPurchase: PendingPurchase | undefined;
  readonly offer: TradeOfferSnapshot;
  readonly now: Date;
}): TradeVerificationResult {
  const { pendingPurchase, offer, now } = input;
  if (pendingPurchase === undefined) return { action: "manual_review", reason: "MISSING_PENDING_PURCHASE" };
  if (pendingPurchase.processed) return { action: "reject", reason: "PENDING_ALREADY_PROCESSED" };
  if (!offer.active || offer.expiresAt.getTime() <= now.getTime()) return { action: "reject", reason: "OFFER_EXPIRED_OR_INACTIVE" };
  if (offer.partnerSteamId64 !== pendingPurchase.expectedPartnerSteamId64) return { action: "reject", reason: "PARTNER_MISMATCH" };
  if (offer.itemsToGive.length > 0) return { action: "reject", reason: "ITEMS_TO_GIVE_NOT_EMPTY" };
  if (offer.itemsToReceive.length !== pendingPurchase.expectedAssetIds.length) {
    return { action: "reject", reason: "RECEIVE_COUNT_MISMATCH" };
  }
  const received = offer.itemsToReceive.map((item) => item.assetId).sort();
  const expected = [...pendingPurchase.expectedAssetIds].sort();
  const allAssetsMatch = expected.every((assetId, index) => received[index] === assetId);
  if (!allAssetsMatch) return { action: "reject", reason: "ASSET_MISMATCH" };
  return { action: "accept", reason: "VERIFIED" };
}
