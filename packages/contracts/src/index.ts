import type {
  AccountId,
  AuctionId,
  AuctionSnapshot,
  CoinAmount,
  MarketItem,
  PendingPurchase,
  ReferencePrice,
  TradeOfferId,
  TradeOfferSnapshot
} from "@csgoempire-bot/domain";

export type ContractStatus = "UNVERIFIED_EXTERNAL_CONTRACT" | "VERIFIED";

export type CommandRecord = {
  readonly commandId: string;
  readonly correlationId: string;
  readonly accountId: AccountId;
  readonly kind: "buy" | "bid" | "accept_trade";
  readonly dryRun: boolean;
  readonly createdAt: Date;
};

export type CommandStatus =
  | "proposed"
  | "persisted"
  | "sending"
  | "confirmed"
  | "rejected"
  | "unknown"
  | "reconciling"
  | "manual_review";

export type StoredCommand = {
  readonly record: CommandRecord;
  readonly status: CommandStatus;
  readonly unknownReason?: string;
  readonly updatedAt: Date;
};

export type EmpireMarketGateway = {
  readonly contractStatus: ContractStatus;
  readonly getFixedPriceItems: () => Promise<readonly MarketItem[]>;
  readonly getReferencePrice: (marketName: string) => Promise<ReferencePrice | undefined>;
};

export type EmpireTradingGateway = {
  readonly contractStatus: ContractStatus;
  readonly buyItem: (command: CommandRecord) => Promise<"dry_run_recorded" | "unknown">;
  readonly placeBid: (command: CommandRecord) => Promise<"dry_run_recorded" | "unknown">;
};

export type EmpireRealtimeGateway = {
  readonly contractStatus: ContractStatus;
  readonly subscribeAuctions: (handler: (snapshot: AuctionSnapshot) => void) => Promise<() => Promise<void>>;
};

export type SteamTradeGateway = {
  readonly contractStatus: ContractStatus;
  readonly findTradeOffer: (tradeOfferId: TradeOfferId) => Promise<TradeOfferSnapshot | undefined>;
};

export type ReferencePriceProvider = {
  readonly getReferencePrice: (marketName: string) => Promise<ReferencePrice | undefined>;
};

export type AccountRepository = {
  readonly getBalance: (accountId: AccountId) => Promise<CoinAmount | undefined>;
};

export type AuctionRepository = {
  readonly save: (snapshot: AuctionSnapshot) => Promise<void>;
  readonly find: (auctionId: AuctionId) => Promise<AuctionSnapshot | undefined>;
};

export type PurchaseRepository = {
  readonly save: (purchase: PendingPurchase) => Promise<void>;
  readonly find: (purchaseId: string) => Promise<PendingPurchase | undefined>;
};

export type CommandRepository = {
  readonly persist: (record: CommandRecord) => Promise<void>;
  readonly find: (commandId: string) => Promise<StoredCommand | undefined>;
  readonly markUnknown: (commandId: string, reason: string) => Promise<void>;
  readonly findReconciliationRequired: (accountId: AccountId) => Promise<readonly StoredCommand[]>;
};

export type LeaseResult =
  | { readonly acquired: true; readonly leaseId: string }
  | { readonly acquired: false; readonly reason: "already_held" | "unavailable" };

export type CacheCoordinator = {
  readonly acquireLease: (key: string, ttlMs: number) => Promise<LeaseResult>;
  readonly releaseLease: (leaseId: string) => Promise<void>;
};

export type EventPublisher = {
  readonly publish: (event: { readonly type: string; readonly occurredAt: Date }) => Promise<void>;
};

export type Clock = {
  readonly now: () => Date;
};

export type IdGenerator = {
  readonly nextId: (prefix: string) => string;
};
