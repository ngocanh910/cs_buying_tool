import type { AuctionId } from "./value-objects.js";

export function applyFixedPriceEvent(seenEventIds: Set<string>, eventId: string): { readonly duplicate: boolean } {
  if (seenEventIds.has(eventId)) return { duplicate: true };
  seenEventIds.add(eventId);
  return { duplicate: false };
}

export type AuctionEventState = {
  readonly auctionId: AuctionId;
  readonly version: number;
  readonly endsAt: Date;
};

export function applyAuctionEvent(current: AuctionEventState, incoming: AuctionEventState): AuctionEventState {
  if (incoming.auctionId !== current.auctionId || incoming.version <= current.version) return current;
  return {
    auctionId: current.auctionId,
    version: incoming.version,
    endsAt: incoming.endsAt.getTime() > current.endsAt.getTime() ? incoming.endsAt : current.endsAt
  };
}
