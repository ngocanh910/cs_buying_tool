import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type {
  AccountRepository,
  AuctionRepository,
  CommandRecord,
  CommandRepository,
  CommandStatus,
  ControlPlaneState,
  ControlPlaneStore,
  PurchaseRepository,
  StoredCommand
} from "@csgoempire-bot/contracts";
import { accountId } from "@csgoempire-bot/domain";
import type { AccountId, AuctionId, AuctionSnapshot, CoinAmount, PendingPurchase } from "@csgoempire-bot/domain";

export type Migration = {
  readonly id: string;
  readonly sql: string;
};

export type JsonLike = null | boolean | number | string | readonly JsonLike[] | { readonly [key: string]: JsonLike };

export type SealedSecret = {
  readonly algorithm: "aes-256-gcm";
  readonly keyId: "local-development";
  readonly iv: string;
  readonly tag: string;
  readonly ciphertext: string;
};

export type EnvelopeEncryption = {
  readonly seal: (plaintext: string) => SealedSecret;
  readonly open: (sealed: unknown) => string;
};

const redactedValue = "[REDACTED]";
const secretKeyPattern = /authorization|cookie|session|token|api[-_]?key|password|secret|two[-_]?factor/i;

function isJsonArray(value: JsonLike): value is readonly JsonLike[] {
  return Array.isArray(value);
}

function parseSealedSecret(value: unknown): SealedSecret {
  if (value === null || typeof value !== "object") {
    throw new Error("Unsupported sealed secret metadata");
  }
  const candidate = value as Record<string, unknown>;
  if (
    candidate["algorithm"] !== "aes-256-gcm" ||
    candidate["keyId"] !== "local-development" ||
    typeof candidate["iv"] !== "string" ||
    typeof candidate["tag"] !== "string" ||
    typeof candidate["ciphertext"] !== "string"
  ) {
    throw new Error("Unsupported sealed secret metadata");
  }
  return {
    algorithm: candidate["algorithm"],
    keyId: candidate["keyId"],
    iv: candidate["iv"],
    tag: candidate["tag"],
    ciphertext: candidate["ciphertext"]
  };
}

export type SqlExecutor = {
  readonly appliedMigrationIds: () => Promise<readonly string[]>;
  readonly execute: (sql: string) => Promise<void>;
  readonly recordMigration: (id: string) => Promise<void>;
  readonly runInTransaction?: (operation: () => Promise<void>) => Promise<void>;
};

export type SqlClient = {
  readonly query: <TRow>(sql: string, params: readonly unknown[]) => Promise<readonly TRow[]>;
  readonly transaction: <TResult>(operation: () => Promise<TResult>) => Promise<TResult>;
};

type CommandRecordRow = {
  readonly command_id: string;
  readonly account_id: string;
  readonly command_kind: CommandRecord["kind"];
  readonly dry_run: boolean;
  readonly status: CommandStatus;
  readonly correlation_id: string;
  readonly unknown_reason: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
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

  public persistProposed(record: CommandRecord): Promise<void> {
    return this.insert(record, "proposed");
  }

  public persist(record: CommandRecord): Promise<void> {
    return this.insert(record, "persisted");
  }

  private insert(record: CommandRecord, status: StoredCommand["status"]): Promise<void> {
    if (this.commands.has(record.commandId)) {
      return Promise.reject(new Error(`Duplicate command: ${record.commandId}`));
    }
    this.commands.set(record.commandId, {
      record,
      status,
      updatedAt: record.createdAt
    });
    return Promise.resolve();
  }

  public find(commandId: string): Promise<StoredCommand | undefined> {
    return Promise.resolve(this.commands.get(commandId));
  }

  public listRecent(limit: number): Promise<readonly StoredCommand[]> {
    const boundedLimit = Math.max(0, Math.floor(limit));
    return Promise.resolve(
      [...this.commands.values()]
        .sort((left, right) => right.record.createdAt.getTime() - left.record.createdAt.getTime())
        .slice(0, boundedLimit)
    );
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

export class SqlCommandRepository implements CommandRepository {
  public constructor(
    private readonly client: SqlClient,
    private readonly clock: { readonly now: () => Date } = { now: () => new Date() }
  ) {}

  public persistProposed(record: CommandRecord): Promise<void> {
    return this.insert(record, "proposed");
  }

  public persist(record: CommandRecord): Promise<void> {
    return this.insert(record, "persisted");
  }

  private async insert(record: CommandRecord, status: CommandStatus): Promise<void> {
    await this.client.transaction(async () => {
      await this.client.query(
        `insert into command_records
          (command_id, account_id, command_kind, dry_run, status, correlation_id, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.commandId,
          record.accountId,
          record.kind,
          record.dryRun,
          status,
          record.correlationId,
          record.createdAt,
          record.createdAt
        ]
      );
    });
  }

  public async find(commandId: string): Promise<StoredCommand | undefined> {
    const rows = await this.client.query<CommandRecordRow>(
      `select command_id, account_id, command_kind, dry_run, status, correlation_id, unknown_reason, created_at, updated_at
        from command_records
        where command_id = $1`,
      [commandId]
    );
    return rows[0] === undefined ? undefined : rowToStoredCommand(rows[0]);
  }

  public async listRecent(limit: number): Promise<readonly StoredCommand[]> {
    const rows = await this.client.query<CommandRecordRow>(
      `select command_id, account_id, command_kind, dry_run, status, correlation_id, unknown_reason, created_at, updated_at
        from command_records
        order by created_at desc
        limit $1`,
      [Math.max(0, Math.floor(limit))]
    );
    return rows.map(rowToStoredCommand);
  }

  public async markUnknown(commandId: string, reason: string): Promise<void> {
    const updatedAt = this.clock.now();
    const rows = await this.client.query<CommandRecordRow>(
      `update command_records
        set status = 'unknown', unknown_reason = $1, updated_at = $2
        where command_id = $3
        returning command_id, account_id, command_kind, dry_run, status, correlation_id, unknown_reason, created_at, updated_at`,
      [reason, updatedAt, commandId]
    );
    if (rows[0] === undefined) {
      throw new Error(`Command not found: ${commandId}`);
    }
  }

  public async findReconciliationRequired(targetAccountId: AccountId): Promise<readonly StoredCommand[]> {
    const rows = await this.client.query<CommandRecordRow>(
      `select command_id, account_id, command_kind, dry_run, status, correlation_id, unknown_reason, created_at, updated_at
        from command_records
        where account_id = $1 and status in ('unknown', 'reconciling')
        order by updated_at asc`,
      [targetAccountId]
    );
    return rows.map(rowToStoredCommand);
  }
}

function rowToStoredCommand(row: CommandRecordRow): StoredCommand {
  const stored: StoredCommand = {
    record: {
      commandId: row.command_id,
      correlationId: row.correlation_id,
      accountId: accountId(row.account_id),
      kind: row.command_kind,
      dryRun: row.dry_run,
      createdAt: row.created_at
    },
    status: row.status,
    updatedAt: row.updated_at
  };
  return row.unknown_reason === null ? stored : { ...stored, unknownReason: row.unknown_reason };
}

export function redactSecrets(value: JsonLike): JsonLike {
  if (isJsonArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value) as readonly [string, JsonLike][];
    return Object.fromEntries(
      entries.map(([key, nestedValue]) => [
        key,
        secretKeyPattern.test(key) ? redactedValue : redactSecrets(nestedValue)
      ])
    );
  }
  return value;
}

export function createLocalEnvelopeEncryption(rawKey: string): EnvelopeEncryption {
  const key = Buffer.from(rawKey, "utf8");
  if (key.byteLength !== 32) {
    throw new Error("Local encryption key must be a 32-byte string");
  }

  return {
    seal: (plaintext) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return {
        algorithm: "aes-256-gcm",
        keyId: "local-development",
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64")
      };
    },
    open: (rawSealed) => {
      const sealed = parseSealedSecret(rawSealed);
      const decipher = createDecipheriv(sealed.algorithm, key, Buffer.from(sealed.iv, "base64"));
      decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(sealed.ciphertext, "base64")),
        decipher.final()
      ]);
      return plaintext.toString("utf8");
    }
  };
}

export class InMemoryControlPlaneStore implements ControlPlaneStore {
  private globalKillSwitch = false;
  private readonly pausedAccounts = new Set<AccountId>();

  public getState(): Promise<ControlPlaneState> {
    return Promise.resolve({
      globalKillSwitch: this.globalKillSwitch,
      pausedAccounts: new Set(this.pausedAccounts)
    });
  }

  public setGlobalKillSwitch(enabled: boolean): Promise<void> {
    this.globalKillSwitch = enabled;
    return Promise.resolve();
  }

  public setAccountPaused(accountId: AccountId, paused: boolean): Promise<void> {
    if (paused) {
      this.pausedAccounts.add(accountId);
    } else {
      this.pausedAccounts.delete(accountId);
    }
    return Promise.resolve();
  }
}
