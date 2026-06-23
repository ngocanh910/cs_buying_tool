import { describe, expect, it } from "vitest";
import { loadEnv } from "./index.js";

describe("environment validation", () => {
  it("keeps local encryption key optional for simulation defaults", () => {
    const env = loadEnv({});

    expect(env.LOCAL_ENCRYPTION_KEY).toBeUndefined();
    expect(env.APP_MODE).toBe("simulation");
    expect(env.TRADING_MODE).toBe("dry_run");
    expect(env.LIVE_TRADING_ENABLED).toBe(false);
  });

  it("accepts a 32-byte local encryption key", () => {
    const env = loadEnv({
      LOCAL_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef"
    });

    expect(env.LOCAL_ENCRYPTION_KEY).toBe("0123456789abcdef0123456789abcdef");
  });

  it("rejects a configured local encryption key that is not 32 bytes", () => {
    expect(() =>
      loadEnv({
        LOCAL_ENCRYPTION_KEY: "short"
      })
    ).toThrow();
  });
});
