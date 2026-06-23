import { decideBid, decideSniping } from "@csgoempire-bot/domain";
import type {
  AccountId,
  AuctionSnapshot,
  BiddingConfig,
  CoinAmount,
  ReferencePrice,
  SnipingConfig
} from "@csgoempire-bot/domain";
import type {
  Clock,
  CommandRepository,
  ControlPlaneStore,
  EmpireMarketGateway,
  IdGenerator
} from "@csgoempire-bot/contracts";

export type DryRunAccountControls = {
  readonly accountId: AccountId;
  readonly paused: boolean;
  readonly killSwitch: boolean;
};

export async function resolveDryRunAccountControls(
  controlPlaneStore: ControlPlaneStore,
  accountId: AccountId
): Promise<DryRunAccountControls> {
  const state = await controlPlaneStore.getState();
  return {
    accountId,
    paused: state.pausedAccounts.has(accountId),
    killSwitch: state.globalKillSwitch
  };
}

export type FixedPriceDryRunInput = {
  readonly account: DryRunAccountControls;
  readonly config: SnipingConfig;
  readonly marketGateway: EmpireMarketGateway;
  readonly commandRepository: CommandRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
};

export type FixedPriceDryRunResult = {
  readonly proposedCommands: readonly string[];
  readonly skippedItems: readonly string[];
  readonly blockedReason?: "WORKER_PAUSED" | "KILL_SWITCH_ENABLED";
};

export type AuctionDryRunInput = {
  readonly account: DryRunAccountControls & {
    readonly balance: CoinAmount;
  };
  readonly auction: AuctionSnapshot;
  readonly reference: ReferencePrice | undefined;
  readonly config: BiddingConfig;
  readonly commandRepository: CommandRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
};

export type AuctionDryRunResult =
  | { readonly kind: "proposed"; readonly proposedCommandId: string }
  | { readonly kind: "skipped"; readonly reason: string };

export async function runFixedPriceDryRun(input: FixedPriceDryRunInput): Promise<FixedPriceDryRunResult> {
  const blockedReason = getBlockedReason(input.account);
  if (blockedReason !== undefined) {
    return { proposedCommands: [], skippedItems: [], blockedReason };
  }

  const proposedCommands: string[] = [];
  const skippedItems: string[] = [];
  const items = await input.marketGateway.getFixedPriceItems();

  for (const item of items) {
    const reference = await input.marketGateway.getReferencePrice(item.name);
    const decision = decideSniping({
      item,
      reference,
      config: input.config,
      now: input.clock.now()
    });

    if (decision.kind === "buy") {
      const commandId = input.idGenerator.nextId("dry-run-buy");
      await input.commandRepository.persistProposed({
        commandId,
        correlationId: input.idGenerator.nextId("correlation"),
        accountId: input.account.accountId,
        kind: "buy",
        dryRun: true,
        createdAt: input.clock.now()
      });
      proposedCommands.push(commandId);
    } else {
      skippedItems.push(item.id);
    }
  }

  return { proposedCommands, skippedItems };
}

export async function runAuctionDryRun(input: AuctionDryRunInput): Promise<AuctionDryRunResult> {
  const decision = decideBid({
    auction: input.auction,
    reference: input.reference,
    config: input.config,
    account: input.account,
    now: input.clock.now()
  });

  if (decision.kind === "skip") {
    return { kind: "skipped", reason: decision.reason };
  }

  const commandId = input.idGenerator.nextId("dry-run-bid");
  await input.commandRepository.persistProposed({
    commandId,
    correlationId: input.idGenerator.nextId("correlation"),
    accountId: input.account.accountId,
    kind: "bid",
    dryRun: true,
    createdAt: input.clock.now()
  });

  return { kind: "proposed", proposedCommandId: commandId };
}

function getBlockedReason(account: DryRunAccountControls): FixedPriceDryRunResult["blockedReason"] {
  if (account.killSwitch) {
    return "KILL_SWITCH_ENABLED";
  }
  if (account.paused) {
    return "WORKER_PAUSED";
  }
  return undefined;
}
