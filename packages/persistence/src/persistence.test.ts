import { describe, expect, it } from "vitest";
import { accountId } from "@csgoempire-bot/domain";
import {
  InMemoryCommandRepository,
  listMigrations,
  runMigrations,
  SqlCommandRepository,
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

  it("lists recent commands with a bounded limit", async () => {
    const repository = new InMemoryCommandRepository();
    await repository.persist({
      ...command,
      commandId: "command-1",
      createdAt: new Date("2026-06-10T00:00:00.000Z")
    });
    await repository.persist({
      ...command,
      commandId: "command-2",
      createdAt: new Date("2026-06-10T00:00:01.000Z")
    });

    const recent = await repository.listRecent(1);

    expect(recent.map((stored) => stored.record.commandId)).toEqual(["command-2"]);
  });

  it("persists commands through a SQL transaction before send-capable state", async () => {
    const client = new FakeSqlClient();
    client.addAccount("account-1");
    const repository = new SqlCommandRepository(client);

    await repository.persist(command);

    expect(client.calls).toContain("begin");
    expect(client.rows.command_records.get("command-1")?.status).toBe("persisted");
    expect(client.rows.command_records.get("command-1")?.dry_run).toBe(true);
  });

  it("persists unknown outcomes for reconciliation through SQL storage", async () => {
    const client = new FakeSqlClient();
    client.addAccount("account-1");
    const repository = new SqlCommandRepository(client, {
      now: () => new Date("2026-06-13T00:00:01.000Z")
    });

    await repository.persist(command);
    await repository.markUnknown(command.commandId, "timeout_after_send");

    const pending = await repository.findReconciliationRequired(accountId("account-1"));
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("unknown");
    expect(pending[0]?.unknownReason).toBe("timeout_after_send");
    expect(pending[0]?.updatedAt).toEqual(new Date("2026-06-13T00:00:01.000Z"));
  });

  it("propagates SQL account foreign-key failures without recording a command", async () => {
    const client = new FakeSqlClient();
    const repository = new SqlCommandRepository(client);

    await expect(repository.persist(command)).rejects.toThrow("account foreign key");
    expect(client.rows.command_records.has("command-1")).toBe(false);
    expect(client.calls).toContain("rollback");
  });
});

type FakeCommandRow = {
  readonly command_id: string;
  readonly account_id: string;
  readonly command_kind: "buy" | "bid" | "accept_trade";
  readonly dry_run: boolean;
  readonly status: string;
  readonly correlation_id: string;
  readonly unknown_reason: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

class FakeSqlClient {
  public readonly calls: string[] = [];
  public readonly rows = {
    accounts: new Set<string>(),
    command_records: new Map<string, FakeCommandRow>()
  };

  public addAccount(accountId: string): void {
    this.rows.accounts.add(accountId);
  }

  public async transaction<T>(operation: () => Promise<T>): Promise<T> {
    this.calls.push("begin");
    try {
      const result = await operation();
      this.calls.push("commit");
      return result;
    } catch (error) {
      this.calls.push("rollback");
      throw error;
    }
  }

  public query<T>(sql: string, params: readonly unknown[]): Promise<readonly T[]> {
    this.calls.push(sql);
    if (sql.startsWith("insert into command_records")) {
      const row: FakeCommandRow = {
        command_id: String(params[0]),
        account_id: String(params[1]),
        command_kind: params[2] as FakeCommandRow["command_kind"],
        dry_run: Boolean(params[3]),
        status: String(params[4]),
        correlation_id: String(params[5]),
        unknown_reason: null,
        created_at: params[6] as Date,
        updated_at: params[7] as Date
      };
      if (!this.rows.accounts.has(row.account_id)) {
        return Promise.reject(new Error("account foreign key violation"));
      }
      if (this.rows.command_records.has(row.command_id)) {
        return Promise.reject(new Error("duplicate key"));
      }
      this.rows.command_records.set(row.command_id, row);
      return Promise.resolve([]);
    }
    if (sql.startsWith("update command_records")) {
      const commandId = String(params[2]);
      const existing = this.rows.command_records.get(commandId);
      if (existing === undefined) {
        return Promise.resolve([]);
      }
      this.rows.command_records.set(commandId, {
        ...existing,
        status: "unknown",
        unknown_reason: String(params[0]),
        updated_at: params[1] as Date
      });
      return Promise.resolve([this.rows.command_records.get(commandId) as T]);
    }
    if (sql.includes("where account_id = $1")) {
      return Promise.resolve(
        [...this.rows.command_records.values()].filter(
          (row) => row.account_id === params[0] && (row.status === "unknown" || row.status === "reconciling")
        ) as unknown as readonly T[]
      );
    }
    if (sql.includes("where command_id = $1")) {
      const row = this.rows.command_records.get(String(params[0]));
      return Promise.resolve(row === undefined ? [] : ([row] as unknown as readonly T[]));
    }
    if (sql.includes("order by created_at desc")) {
      return Promise.resolve(
        [...this.rows.command_records.values()]
          .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())
          .slice(0, Number(params[0])) as unknown as readonly T[]
      );
    }
    return Promise.reject(new Error(`Unexpected SQL: ${sql}`));
  }
}
