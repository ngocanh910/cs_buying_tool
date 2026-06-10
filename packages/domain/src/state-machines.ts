export type WorkerState = "INIT" | "CONNECTING" | "RUNNING" | "PAUSED" | "RECONNECTING" | "ERROR" | "STOPPED";
export type AuctionWatcherState =
  | "DISCOVERED"
  | "FILTERED_OUT"
  | "WATCHING"
  | "SNIPE_READY"
  | "BID_PENDING"
  | "LEADING"
  | "OUTBID"
  | "WON"
  | "LOST"
  | "ABANDONED"
  | "ERROR";
export type PurchaseTradeState =
  | "DETECTED"
  | "ACTION_PLANNED"
  | "ACTION_SUBMITTED"
  | "CONFIRMED"
  | "TRADE_PENDING"
  | "TRADE_VERIFIED"
  | "TRADE_ACCEPTED"
  | "TRADE_REJECTED"
  | "RECONCILIATION_REQUIRED";

const workerTransitions: Readonly<Record<WorkerState, readonly WorkerState[]>> = {
  INIT: ["CONNECTING", "STOPPED"],
  CONNECTING: ["RUNNING", "RECONNECTING", "ERROR", "STOPPED"],
  RUNNING: ["PAUSED", "RECONNECTING", "ERROR", "STOPPED"],
  PAUSED: ["RUNNING", "STOPPED"],
  RECONNECTING: ["RUNNING", "ERROR", "STOPPED"],
  ERROR: ["RECONNECTING", "STOPPED"],
  STOPPED: []
};

const watcherTransitions: Readonly<Record<AuctionWatcherState, readonly AuctionWatcherState[]>> = {
  DISCOVERED: ["FILTERED_OUT", "WATCHING", "ERROR"],
  FILTERED_OUT: [],
  WATCHING: ["SNIPE_READY", "OUTBID", "WON", "LOST", "ABANDONED", "ERROR"],
  SNIPE_READY: ["BID_PENDING", "ABANDONED", "ERROR"],
  BID_PENDING: ["LEADING", "OUTBID", "ERROR"],
  LEADING: ["OUTBID", "WON", "LOST", "ERROR"],
  OUTBID: ["SNIPE_READY", "LOST", "ABANDONED", "ERROR"],
  WON: [],
  LOST: [],
  ABANDONED: [],
  ERROR: []
};

const purchaseTransitions: Readonly<Record<PurchaseTradeState, readonly PurchaseTradeState[]>> = {
  DETECTED: ["ACTION_PLANNED", "RECONCILIATION_REQUIRED"],
  ACTION_PLANNED: ["ACTION_SUBMITTED", "RECONCILIATION_REQUIRED"],
  ACTION_SUBMITTED: ["CONFIRMED", "RECONCILIATION_REQUIRED"],
  CONFIRMED: ["TRADE_PENDING"],
  TRADE_PENDING: ["TRADE_VERIFIED", "TRADE_REJECTED", "RECONCILIATION_REQUIRED"],
  TRADE_VERIFIED: ["TRADE_ACCEPTED", "TRADE_REJECTED"],
  TRADE_ACCEPTED: [],
  TRADE_REJECTED: [],
  RECONCILIATION_REQUIRED: []
};

export function advanceWorker(from: WorkerState, to: WorkerState): WorkerState {
  if (!workerTransitions[from].includes(to)) throw new Error(`Invalid worker transition: ${from} -> ${to}`);
  return to;
}

export function advanceAuctionWatcher(from: AuctionWatcherState, to: AuctionWatcherState): AuctionWatcherState {
  if (!watcherTransitions[from].includes(to)) throw new Error(`Invalid auction watcher transition: ${from} -> ${to}`);
  return to;
}

export function advancePurchaseTrade(from: PurchaseTradeState, to: PurchaseTradeState): PurchaseTradeState {
  if (!purchaseTransitions[from].includes(to)) throw new Error(`Invalid purchase/trade transition: ${from} -> ${to}`);
  return to;
}
