import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_MODE: z.enum(["simulation", "dry_run", "live"]).default("simulation"),
  TRADING_MODE: z.enum(["dry_run", "live"]).default("dry_run"),
  LIVE_TRADING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  CONTROL_PLANE_TOKEN: z
    .string()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  LOCAL_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.byteLength(value, "utf8") === 32, "LOCAL_ENCRYPTION_KEY must be a 32-byte string")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv): AppEnv {
  const parsed = envSchema.parse(env);
  if (parsed.LIVE_TRADING_ENABLED && (parsed.APP_MODE !== "live" || parsed.TRADING_MODE !== "live")) {
    throw new Error("Live trading requires both APP_MODE=live and TRADING_MODE=live");
  }
  return parsed;
}
