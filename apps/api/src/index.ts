import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import { loadEnv } from "@csgoempire-bot/config";

export function buildApi() {
  const env = loadEnv(process.env);
  const app = Fastify({ logger: false });

  app.get("/health", () => ({
    status: "ok",
    appMode: env.APP_MODE,
    tradingMode: env.TRADING_MODE,
    liveTradingEnabled: env.LIVE_TRADING_ENABLED
  }));

  return app;
}

const entrypoint = process.argv[1];

if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  const app = buildApi();
  await app.listen({ port: 3000, host: "127.0.0.1" });
}
