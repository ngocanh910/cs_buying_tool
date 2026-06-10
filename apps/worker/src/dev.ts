import { loadEnv } from "@csgoempire-bot/config";
import { advanceWorker } from "@csgoempire-bot/domain";
import { createLogger } from "@csgoempire-bot/observability";

const env = loadEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);
const state = advanceWorker("INIT", "CONNECTING");

logger.info({ state, appMode: env.APP_MODE, tradingMode: env.TRADING_MODE }, "worker dev booted without live trading");
