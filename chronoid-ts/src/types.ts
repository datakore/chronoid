export interface SnowflakeComponents {
  year: number;
  day: number;
  minute: number;
  millisecond: number;
}

export enum AsyncExhaustionStrategy {
  Throw = "Throw",
  WaitAsync = "WaitAsync"
}

export enum SyncExhaustionStrategy {
  Throw = "Throw",
  Block = "Block"
}
