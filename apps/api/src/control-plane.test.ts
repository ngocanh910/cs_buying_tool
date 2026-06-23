import { describe, expect, it } from "vitest";
import { accountId } from "@csgoempire-bot/domain";
import { InMemoryCommandRepository, InMemoryControlPlaneStore } from "@csgoempire-bot/persistence";
import { buildApi } from "./index.js";
import type { AppEnv } from "@csgoempire-bot/config";

const controlPlaneToken = "test-control-token";

const testEnv: AppEnv = {
  NODE_ENV: "test",
  APP_MODE: "simulation",
  TRADING_MODE: "dry_run",
  LIVE_TRADING_ENABLED: false,
  LOG_LEVEL: "info",
  CONTROL_PLANE_TOKEN: controlPlaneToken
};

const authHeaders = {
  authorization: `Bearer ${controlPlaneToken}`
};

describe("control plane API", () => {
  it("reports safe runtime status with live trading disabled", async () => {
    const app = buildApi({
      env: testEnv
    });

    const response = await app.inject({ method: "GET", url: "/control/status", headers: authHeaders });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      appMode: "simulation",
      tradingMode: "dry_run",
      liveTradingEnabled: false,
      globalKillSwitch: false,
      pausedAccounts: []
    });
  });

  it("enables global kill switch through an explicit boolean body", async () => {
    const controlPlaneStore = new InMemoryControlPlaneStore();
    const app = buildApi({
      env: testEnv,
      controlPlaneStore
    });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/control/kill-switch",
      payload: { enabled: "yes" },
      headers: authHeaders
    });
    const enabledResponse = await app.inject({
      method: "POST",
      url: "/control/kill-switch",
      payload: { enabled: true },
      headers: authHeaders
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(enabledResponse.statusCode).toBe(200);
    expect(enabledResponse.json()).toMatchObject({ globalKillSwitch: true });
    await expect(controlPlaneStore.getState()).resolves.toMatchObject({ globalKillSwitch: true });
  });

  it("pauses an account without exposing secrets", async () => {
    const app = buildApi({
      env: testEnv
    });

    const response = await app.inject({
      method: "POST",
      url: "/control/accounts/account-1/pause",
      payload: {
        paused: true,
        apiKey: "secret-value",
        cookie: "session-cookie"
      },
      headers: authHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).not.toContain("secret-value");
    expect(JSON.stringify(response.json())).not.toContain("session-cookie");
    expect(response.json()).toEqual({
      accountId: "account-1",
      paused: true
    });
  });

  it("lists redacted dry-run command audit records", async () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const commandRepository = new InMemoryCommandRepository({ now: () => now });
    await commandRepository.persistProposed({
      commandId: "command-1",
      correlationId: "correlation-1",
      accountId: accountId("account-1"),
      kind: "buy",
      dryRun: true,
      createdAt: now
    });
    await commandRepository.persistProposed({
      commandId: "command-2",
      correlationId: "correlation-2",
      accountId: accountId("account-1"),
      kind: "bid",
      dryRun: true,
      createdAt: new Date("2026-06-10T00:00:01.000Z")
    });

    const app = buildApi({
      env: testEnv,
      commandRepository
    });

    const response = await app.inject({ method: "GET", url: "/control/audit/commands?limit=1", headers: authHeaders });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      commands: [
        {
          commandId: "command-2",
          correlationId: "correlation-2",
          accountId: "account-1",
          kind: "bid",
          dryRun: true,
          status: "proposed",
          createdAt: "2026-06-10T00:00:01.000Z",
          updatedAt: "2026-06-10T00:00:01.000Z"
        }
      ]
    });
  });

  it("rejects control-plane requests without the configured bearer token", async () => {
    const app = buildApi({
      env: testEnv
    });

    const response = await app.inject({ method: "GET", url: "/control/status" });

    expect(response.statusCode).toBe(401);
    expect(JSON.stringify(response.json())).not.toContain("test-control-token");
  });

  it("fails closed when control-plane token is not configured", async () => {
    const app = buildApi({
      env: {
        ...testEnv,
        CONTROL_PLANE_TOKEN: undefined
      }
    });

    const response = await app.inject({ method: "GET", url: "/control/status" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "CONTROL_PLANE_AUTH_NOT_CONFIGURED" });
  });
});
