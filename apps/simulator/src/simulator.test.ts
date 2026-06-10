import { describe, expect, it } from "vitest";
import { runSimulator } from "./simulator.js";

describe("deterministic simulator", () => {
  it("replays all required milestone-one scenarios deterministically", () => {
    const first = runSimulator({ seed: 42 });
    const second = runSimulator({ seed: 42 });

    expect(first).toEqual(second);
    expect(first.results).toHaveLength(17);
    expect(first.results.map((result) => result.name)).toEqual([
      "good_fixed_price_item_buy",
      "fixed_price_margin_too_low",
      "auction_above_max_bid",
      "auction_snipe_window_valid_bid",
      "already_leading_no_bid",
      "outbid_with_room_to_bid",
      "outbid_above_max_bid",
      "auction_extended_time",
      "websocket_disconnect_reconnect",
      "request_timeout_unknown_state",
      "valid_trade_offer",
      "wrong_trade_partner",
      "trade_requires_user_items",
      "asset_id_mismatch",
      "duplicate_event",
      "out_of_order_event",
      "kill_switch_blocks_commands"
    ]);
    expect(first.results.find((result) => result.name === "request_timeout_unknown_state")?.outcome).toBe("reconcile_unknown");
    expect(first.results.find((result) => result.name === "kill_switch_blocks_commands")?.command).toBe("none");
  });
});
