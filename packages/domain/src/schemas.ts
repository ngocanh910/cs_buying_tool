import { z } from "zod";
import { coinAmount, itemId } from "./value-objects.js";
import type { MarketItem, ReferencePrice } from "./models.js";

const isoDateSchema = z.string().datetime().transform((value) => new Date(value));

export const rawMarketItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  listedPrice: z.number().int().nonnegative(),
  seenAt: isoDateSchema
});

export const rawReferencePriceSchema = z.object({
  marketName: z.string().min(1),
  price: z.number().int().nonnegative(),
  listingCount: z.number().int().nonnegative(),
  capturedAt: isoDateSchema,
  reliability: z.enum(["reliable", "unreliable"])
});

export function parseMarketItem(input: unknown): MarketItem {
  const parsed = rawMarketItemSchema.parse(input);
  return {
    id: itemId(parsed.id),
    name: parsed.name,
    category: parsed.category,
    listedPrice: coinAmount(parsed.listedPrice),
    seenAt: parsed.seenAt
  };
}

export function parseReferencePrice(input: unknown): ReferencePrice {
  const parsed = rawReferencePriceSchema.parse(input);
  return {
    marketName: parsed.marketName,
    price: coinAmount(parsed.price),
    listingCount: parsed.listingCount,
    capturedAt: parsed.capturedAt,
    reliability: parsed.reliability
  };
}
