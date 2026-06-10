import { describe, expect, it } from "vitest";
import { accountId } from "@csgoempire-bot/domain";
import {
  InMemoryCommandRepository,
  listMigrations,
  runMigrations,
  type SqlExecutor
} from "./index.js";
import type { CommandRecord } from "@csgoempire-bot/contracts";

describe("migration runner", () => {
  it("lists migrations in deterministic order", () => {
    expect(listMigrations().map((migration) => migration.id)).toEqual(["0001_initial"]);
  });

  it("includes the schema migrations table in the initial migration", () => {
    expect(listMigrations()[0]?.sql).toContain("create table if not exists schema_migrations");
  });

  it("stores command reconciliation evidence columns in the initial migration", () => {
    const sql = listMigrations()[0]?.sql ?? "";

    expect(sql).toContain("unknown_reason text");
    expect(sql).toContain("updated_at timestamptz not null");
  });

  it("applies each pending migration once in order", async () => {
    const calls: string[] = [];
    const executor: SqlExecutor = {
      appliedMigrationIds: () => Promise.resolve([]),
      execute: (sql) => {
        calls.push(sql);
        return Promise.resolve();
      },
      recordMigration: (id) => {
        calls.push(`record:${id}`);
        return Promise.resolve();
      }
    };

    await runMigrations(executor);

    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("create table if not exists accounts");
    expect(calls[1]).toBe("record:0001_initial");
  });

  it("applies and records each migration atomically when the executor supports transactions", async () => {
    const calls: string[] = [];
    const executor: SqlExecutor = {
      appliedMigrationIds: () => Promise.resolve([]),
      execute: (sql) => {
        calls.push(sql);
        return Promise.resolve();
      },
      recordMigration: (id) => {
        calls.push(`record:${id}`);
        return Promise.resolve();
      },
      runInTransaction: async (operation) => {
        calls.push("transaction:start");
        await operation();
        calls.push("transaction:end");
      }
    };

    await runMigrations(executor);

    expect(calls[0]).toBe("transaction:start");
    expect(calls.at(-1)).toBe("transaction:end");
  });

  it("does not reapply already recorded migrations", async () => {
    const calls: string[] = [];
    const executor: SqlExecutor = {
      appliedMigrationIds: () => Promise.resolve(["0001_initial"]),
      execute: (sql) => {
        calls.push(sql);
        return Promise.resolve();
      },
      recordMigration: (id) => {
        calls.push(`record:${id}`);
        return Promise.resolve();
      }
    };

    await runMigrations(executor);

    expect(calls).toEqual([]);
  });
});

describe("command repository", () => {
  const command: CommandRecord = {
    commandId: "command-1",
    correlationId: "correlation-1",
    accountId: accountId("account-1"),
    kind: "buy",
    dryRun: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z")
  };

  it("persists command before state changes", async () => {
    const repository = new InMemoryCommandRepository();

    await repository.persist(command);
    const saved = await repository.find("command-1");

    expect(saved?.status).toBe("persisted");
    expect(saved?.record.correlationId).toBe("correlation-1");
  });

  it("marks unknown outcomes for reconciliation instead of retrying blindly", async () => {
    const repository = new InMemoryCommandRepository({
      now: () => new Date("2026-06-10T00:00:05.000Z")
    });
    await repository.persist(command);

    await repository.markUnknown(command.commandId, "timeout_after_send");
    const pending = await repository.findReconciliationRequired(accountId("account-1"));

    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("unknown");
    expect(pending[0]?.unknownReason).toBe("timeout_after_send");
    expect(pending[0]?.updatedAt).toEqual(new Date("2026-06-10T00:00:05.000Z"));
  });

  it("rejects duplicate command ids", async () => {
    const repository = new InMemoryCommandRepository();
    await repository.persist(command);

    await expect(repository.persist(command)).rejects.toThrow("Duplicate command");
  });
});
