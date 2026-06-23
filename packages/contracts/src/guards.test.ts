import { describe, expect, it } from "vitest";
import { assertVerifiedExternalContract } from "./index.js";

describe("external contract guard", () => {
  it("rejects unverified contracts for live adapter usage", () => {
    expect(() => {
      assertVerifiedExternalContract("UNVERIFIED_EXTERNAL_CONTRACT", "Buy command");
    }).toThrow("UNVERIFIED_EXTERNAL_CONTRACT");
  });

  it("allows verified contracts", () => {
    expect(() => {
      assertVerifiedExternalContract("VERIFIED", "Read-only identity");
    }).not.toThrow();
  });
});
