import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { loadEnv, type AppEnv } from "@csgoempire-bot/config";
import { accountId } from "@csgoempire-bot/domain";
import { InMemoryCommandRepository, InMemoryControlPlaneStore } from "@csgoempire-bot/persistence";
import type { CommandRepository, ControlPlaneStore, StoredCommand } from "@csgoempire-bot/contracts";

type BuildApiOptions = {
  readonly env?: AppEnv;
  readonly commandRepository?: CommandRepository;
  readonly controlPlaneStore?: ControlPlaneStore;
};

const booleanBodySchema = z.object({
  enabled: z.boolean()
});

const pauseBodySchema = z.object({
  paused: z.boolean()
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export function buildApi(options: BuildApiOptions = {}) {
  const env = options.env ?? loadEnv(process.env);
  const commandRepository = options.commandRepository ?? new InMemoryCommandRepository();
  const controlPlaneStore = options.controlPlaneStore ?? new InMemoryControlPlaneStore();
  const app = Fastify({ logger: false });

  app.get("/health", () => ({
    status: "ok",
    appMode: env.APP_MODE,
    tradingMode: env.TRADING_MODE,
    liveTradingEnabled: env.LIVE_TRADING_ENABLED
  }));

  app.addHook("preHandler", (request, reply, done) => {
    if (!request.url.startsWith("/control/")) {
      done();
      return;
    }

    if (env.CONTROL_PLANE_TOKEN === undefined) {
      reply.code(503).send({ error: "CONTROL_PLANE_AUTH_NOT_CONFIGURED" });
      return;
    }

    const expected = `Bearer ${env.CONTROL_PLANE_TOKEN}`;
    if (request.headers.authorization !== expected) {
      reply.code(401).send({ error: "UNAUTHORIZED_CONTROL_PLANE_REQUEST" });
      return;
    }

    done();
  });

  app.get("/control/status", async () => {
    const controlPlane = await controlPlaneStore.getState();
    return {
      appMode: env.APP_MODE,
      tradingMode: env.TRADING_MODE,
      liveTradingEnabled: env.LIVE_TRADING_ENABLED,
      globalKillSwitch: controlPlane.globalKillSwitch,
      pausedAccounts: [...controlPlane.pausedAccounts].sort()
    };
  });

  app.post("/control/kill-switch", async (request, reply) => {
    const parsed = booleanBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_KILL_SWITCH_BODY" });
    }

    await controlPlaneStore.setGlobalKillSwitch(parsed.data.enabled);
    return {
      globalKillSwitch: parsed.data.enabled
    };
  });

  app.post("/control/accounts/:accountId/pause", async (request, reply) => {
    const params = z.object({ accountId: z.string().min(1) }).safeParse(request.params);
    const body = pauseBodySchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "INVALID_ACCOUNT_PAUSE_BODY" });
    }

    const parsedAccountId = accountId(params.data.accountId);
    await controlPlaneStore.setAccountPaused(parsedAccountId, body.data.paused);

    return {
      accountId: parsedAccountId,
      paused: body.data.paused
    };
  });

  app.get("/control/audit/commands", async (request, reply) => {
    const query = auditQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "INVALID_AUDIT_QUERY" });
    }

    const commands = await commandRepository.listRecent(query.data.limit);
    return {
      commands: commands.map(toCommandAuditRecord)
    };
  });

  return app;
}

function toCommandAuditRecord(command: StoredCommand) {
  return {
    commandId: command.record.commandId,
    correlationId: command.record.correlationId,
    accountId: command.record.accountId,
    kind: command.record.kind,
    dryRun: command.record.dryRun,
    status: command.status,
    createdAt: command.record.createdAt.toISOString(),
    updatedAt: command.updatedAt.toISOString()
  };
}

const entrypoint = process.argv[1];

if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  const app = buildApi();
  await app.listen({ port: 3000, host: "127.0.0.1" });
}
