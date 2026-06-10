import type { SteamTradeGateway } from "@csgoempire-bot/contracts";
import type { TradeOfferId, TradeOfferSnapshot } from "@csgoempire-bot/domain";

export class FakeSteamTradeGateway implements SteamTradeGateway {
  public readonly contractStatus = "UNVERIFIED_EXTERNAL_CONTRACT" as const;

  public constructor(private readonly offers: ReadonlyMap<TradeOfferId, TradeOfferSnapshot> = new Map()) {}

  public findTradeOffer(tradeOfferId: TradeOfferId): Promise<TradeOfferSnapshot | undefined> {
    return Promise.resolve(this.offers.get(tradeOfferId));
  }
}
