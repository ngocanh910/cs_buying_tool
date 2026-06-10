import { readFileSync } from "node:fs";
import type {
  AccountRepository,
  AuctionRepository,
  CommandRecord,
  CommandRepository,
  PurchaseRepository,
  StoredCommand
} from "@csgoempire-bot/contracts";
import type { AccountId, AuctionId, AuctionSnapshot, CoinAmount, PendingPurchase } from "@csgoempire-bot/domain";

export type Migration = {
  readonly id: string;
  readonly sql: string;
};

export type SqlExecutor = {
  readonly appliedMigrationIds: () => Promise<readonly string[]>;
  readonly execute: (sql: string) => Promise<void>;
  readonly recordMigration: (id: string) => Promise<void>;
  readonly runInTransaction?: (operation: () => Promise<void>) => Promise<void>;
};

export function listMigrations(): readonly Migration[] {
  const initialSql = readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8");
  return [{ id: "0001_initial", sql: initialSql }];
}

export async function runMigrations(executor: SqlExecutor): Promise<void> {
  const applied = new Set(await executor.appliedMigrationIds());
  for (const migration of listMigrations()) {
    if (!applied.has(migration.id)) {
      const applyMigration = async (): Promise<void> => {
        await executor.execute(migration.sql);
        await executor.recordMigration(migration.id);
      };
      if (executor.runInTransaction !== undefined) {
        await executor.runInTransaction(applyMigration);
      } else {
        await applyMigration();
      }
    }
  }
}

export class InMemoryAccountRepository implements AccountRepository {
  private readonly balances = new Map<AccountId, CoinAmount>();

  public setBalance(accountId: AccountId, balance: CoinAmount): void {
    this.balances.set(accountId, balance);
  }

  public getBalance(accountId: AccountId): Promise<CoinAmount | undefined> {
    return Promise.resolve(this.balances.get(accountId));
  }
}

export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly auctions = new Map<AuctionId, AuctionSnapshot>();

  public save(snapshot: AuctionSnapshot): Promise<void> {
    this.auctions.set(snapshot.id, snapshot);
    return Promise.resolve();
  }

  public find(auctionId: AuctionId): Promise<AuctionSnapshot | undefined> {
    return Promise.resolve(this.auctions.get(auctionId));
  }
}

export class InMemoryPurchaseRepository implements PurchaseRepository {
  private readonly purchases = new Map<string, PendingPurchase>();

  public save(purchase: PendingPurchase): Promise<void> {
    this.purchases.set(purchase.purchaseId, purchase);
    return Promise.resolve();
  }

  public find(purchaseId: string): Promise<PendingPurchase | undefined> {
    return Promise.resolve(this.purchases.get(purchaseId));
  }
}

export class InMemoryCommandRepository implements CommandRepository {
  private readonly commands = new Map<string, StoredCommand>();

  public constructor(private readonly clock: { readonly now: () => Date } = { now: () => new Date() }) {}

  public persist(record: CommandRecord): Promise<void> {
    if (this.commands.has(record.commandId)) {
      return Promise.reject(new Error(`Duplicate command: ${record.commandId}`));
    }
    this.commands.set(record.commandId, {
      record,
      status: "persisted",
      updatedAt: record.createdAt
    });
    return Promise.resolve();
  }

  public find(commandId: string): Promise<StoredCommand | undefined> {
    return Promise.resolve(this.commands.get(commandId));
  }

  public markUnknown(commandId: string, reason: string): Promise<void> {
    const existing = this.commands.get(commandId);
    if (existing === undefined) {
      return Promise.reject(new Error(`Command not found: ${commandId}`));
    }
    this.commands.set(commandId, {
      record: existing.record,
      status: "unknown",
      unknownReason: reason,
      updatedAt: this.clock.now()
    });
    return Promise.resolve();
  }

  public findReconciliationRequired(accountId: AccountId): Promise<readonly StoredCommand[]> {
    return Promise.resolve(
      [...this.commands.values()].filter(
        (command) => command.record.accountId === accountId && (command.status === "unknown" || command.status === "reconciling")
      )
    );
  }
}
