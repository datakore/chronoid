export interface TsComponents {
  readonly year: number;
  readonly day: number;
  readonly minute: number;
  readonly millisecond: number;
}

export enum AsyncExhaustionStrategy {
  Throw = "Throw",
  WaitAsync = "WaitAsync"
}

export enum SyncExhaustionStrategy {
  Throw = "Throw",
  Block = "Block"
}
