import { SnowflakeId } from './SnowflakeId.js';
import { SyncExhaustionStrategy, AsyncExhaustionStrategy } from './types.js';
import { AsyncSnowflakeGenerator } from './AsyncSnowflakeGenerator.js';
import { SequenceExhausted } from './errors.js';

/**
 * Stateful generator for synchronous contexts.
 * Wraps AsyncSnowflakeGenerator internally.
 */
export class SyncSnowflakeGenerator {
  private asyncGenerator: AsyncSnowflakeGenerator;

  /**
   * Internal constructor. Use SnowflakeGenerator.create_sync() instead.
   */
  constructor(
    base_year: number,
    node_id: number,
    worker_id: number,
    private readonly strategy: SyncExhaustionStrategy
  ) {
    // We map internal state to the Async version entirely per the interface-specification block constraints.
    this.asyncGenerator = new AsyncSnowflakeGenerator(base_year, node_id, worker_id, AsyncExhaustionStrategy.Throw);
  }

  public generate(): SnowflakeId {
    while (true) {
      let nowMs = Date.now();
      
      // Inherit the exact identical synchronous generator engine
      const result = this.asyncGenerator.tryGenerate(nowMs);
      
      if (result !== 'EXHAUSTED') {
        return result;
      }

      // Handle the sequence exhaustion context natively blocking synchronous threads
      if (this.strategy === SyncExhaustionStrategy.Throw) {
        throw new SequenceExhausted("Sequence exhausted for current millisecond.");
      } else {
        // Block: Synchronous CPU spin-wait until millisecond naturally ticks over bridging time.
        while (Date.now() <= this.asyncGenerator.last_timestamp) {
          // Empty loop completely locks execution evaluating against single-threaded event bounds 
        }
      }
    }
  }
}
