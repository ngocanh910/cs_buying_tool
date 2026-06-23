import { describe, expect, it } from "vitest";
import { parseMarketItem, parseReferencePrice } from "./schemas.js";

describe("runtime schemas", () => {
  it("parses a valid market item snapshot into domain value objects", () => {
    const item = parseMarketItem({
      id: "item-1",
      name: "AK-47 Test",
      category: "rifle",
      listedPrice: 700,
      seenAt: "2026-06-10T00:00:00.000Z"
    });

    expect(item.listedPrice.value).toBe(700);
  });

  it("rejects invalid external-shaped market item data", () => {
    expect(() =>
      parseMarketItem({
        id: "",
        name: "AK-47 Test",
        category: "rifle",
        listedPrice: -1,
        seenAt: "not-a-date"
      })
    ).toThrow();
  });

  it("rejects unreliable reference price input with invalid count", () => {
    expect(() =>
      parseReferencePrice({
        marketName: "AK-47 Test",
        price: 1000,
        listingCount: -1,
        capturedAt: "2026-06-10T00:00:00.000Z",
        reliability: "reliable"
      })
    ).toThrow();
  });
});
