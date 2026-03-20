import { SnowflakeId } from './SnowflakeId.js';
import { AsyncExhaustionStrategy } from './types.js';
import { SequenceExhausted } from './errors.js';

/**
 * Stateful generator for asynchronous contexts.
 */
export class AsyncSnowflakeGenerator {
  public last_timestamp: number = -1;
  public sequence: number = 0;

  // Time Cache for massive performance optimization natively avoiding Date objects
  private cachedPrefix: bigint = 0n;
  private cachedNextYearMs: number = 0;
  private cachedStartOfYearMs: number = 0;
  private cachedYearOffset: bigint = 0n;

  /**
   * Internal constructor. Use SnowflakeGenerator.create() instead.
   */
  constructor(
    protected readonly base_year: number,
    protected readonly node_id: number,
    protected readonly worker_id: number,
    protected readonly strategy: AsyncExhaustionStrategy
  ) {}

  /**
   * Core synchronous generation engine shared natively between Async and Sync generators.
   * Pulls the absolute clock, ensures synchronization bounds, packs, and shifts the result.
   */
  public tryGenerate(nowMs: number = Date.now()): SnowflakeId | 'EXHAUSTED' {
    if (nowMs < this.last_timestamp) {
      throw new Error(`Clock moved backwards. Refusing to generate id for ${this.last_timestamp - nowMs} milliseconds`);
    }

    if (nowMs === this.last_timestamp) {
      if (this.sequence >= 1023) {
        return 'EXHAUSTED';
      }
      this.sequence++;
      // Zero allocations! Instantly bitwise append sequence to heavily cached prefix limits
      return SnowflakeId.from(BigInt(this.sequence) | this.cachedPrefix);
    }

    this.sequence = 0;
    this.last_timestamp = nowMs;

    // Update Year boundaries only when physically crossing the boundary
    if (nowMs >= this.cachedNextYearMs) {
      const d = new Date(nowMs);
      const yr = d.getUTCFullYear();
      this.cachedYearOffset = BigInt(yr - this.base_year) & 0xFFn;
      this.cachedStartOfYearMs = Date.UTC(yr, 0, 1);
      this.cachedNextYearMs = Date.UTC(yr + 1, 0, 1);
    }

    // Natively extract boundaries using pure modulo math without any object bindings spanning logic
    const day = BigInt(Math.floor((nowMs - this.cachedStartOfYearMs) / 86400000));
    const minute = BigInt(Math.floor(nowMs / 60000) % 1440);
    const millisecond = BigInt(nowMs % 60000);
    const node = BigInt(this.node_id);
    const worker = BigInt(this.worker_id);

    // Cache the completely shifted timestamp block mapping exclusively over sequence limit mappings natively.
    this.cachedPrefix = (worker << 10n) 
                      | (node << 14n) 
                      | (millisecond << 19n) 
                      | (minute << 35n) 
                      | (day << 46n) 
                      | (this.cachedYearOffset << 55n);

    // Sequence is 0 right now, returning inherently zero logic checks mapped naturally over the footprint.
    return SnowflakeId.from(this.cachedPrefix);
  }

  public async generate(): Promise<SnowflakeId> {
    while (true) {
      let nowMs = Date.now();
      const result = this.tryGenerate(nowMs);
      
      if (result !== 'EXHAUSTED') {
        return result;
      }

      // Exhaustion fallback strategies natively scoped for async implementation
      if (this.strategy === AsyncExhaustionStrategy.Throw) {
        throw new SequenceExhausted("Sequence exhausted for current millisecond.");
      } else {
        // WaitAsync: yield the event loop dynamically using setImmediate
        // This spins drastically faster than setTimeout (which is natively bound to 1-15ms OS ticks), 
        // allowing it to precisely capture the exact microsecond the clock rolls over!
        while (nowMs <= this.last_timestamp) {
          await new Promise(resolve => setImmediate(resolve));
          nowMs = Date.now();
        }
      }
    }
  }
}
