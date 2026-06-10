import type {
  CommandRecord,
  EmpireMarketGateway,
  EmpireRealtimeGateway,
  EmpireTradingGateway
} from "@csgoempire-bot/contracts";
import type { AuctionSnapshot, MarketItem, ReferencePrice } from "@csgoempire-bot/domain";

export class FakeEmpireGateway implements EmpireMarketGateway, EmpireTradingGateway, EmpireRealtimeGateway {
  public readonly contractStatus = "UNVERIFIED_EXTERNAL_CONTRACT" as const;

  public constructor(
    private readonly items: readonly MarketItem[] = [],
    private readonly references: ReadonlyMap<string, ReferencePrice> = new Map()
  ) {}

  public getFixedPriceItems(): Promise<readonly MarketItem[]> {
    return Promise.resolve(this.items);
  }

  public getReferencePrice(marketName: string): Promise<ReferencePrice | undefined> {
    return Promise.resolve(this.references.get(marketName));
  }

  public buyItem(command: CommandRecord): Promise<"dry_run_recorded"> {
    void command;
    return Promise.resolve("dry_run_recorded");
  }

  public placeBid(command: CommandRecord): Promise<"dry_run_recorded"> {
    void command;
    return Promise.resolve("dry_run_recorded");
  }

  public subscribeAuctions(handler: (snapshot: AuctionSnapshot) => void): Promise<() => Promise<void>> {
    void handler;
    return Promise.resolve(() => Promise.resolve());
  }
}
