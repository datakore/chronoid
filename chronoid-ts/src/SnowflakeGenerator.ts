import { AsyncSnowflakeGenerator } from './AsyncSnowflakeGenerator.js';
import { SyncSnowflakeGenerator } from './SyncSnowflakeGenerator.js';
import { AsyncExhaustionStrategy, SyncExhaustionStrategy } from './types.js';
import { InvalidNodeId, InvalidWorkerId } from './errors.js';

/**
 * Static factory responsible for constructing and validating generator instances.
 */
export class SnowflakeGenerator {
  public static create(
    base_year: number,
    node_id: number,
    worker_id: number,
    strategy: AsyncExhaustionStrategy
  ): AsyncSnowflakeGenerator {
    SnowflakeGenerator.validateConfig(base_year, node_id, worker_id);
    return new AsyncSnowflakeGenerator(base_year, node_id, worker_id, strategy);
  }

  public static create_sync(
    base_year: number,
    node_id: number,
    worker_id: number,
    strategy: SyncExhaustionStrategy
  ): SyncSnowflakeGenerator {
    SnowflakeGenerator.validateConfig(base_year, node_id, worker_id);
    return new SyncSnowflakeGenerator(base_year, node_id, worker_id, strategy);
  }

  private static validateConfig(base_year: number, node_id: number, worker_id: number): void {
    if (base_year < 1900 || base_year > 2200) {
      throw new Error(`base_year must be between 1900 and 2200. Got: ${base_year}`);
    }
    if (node_id < 0 || node_id > 15) {
      throw new InvalidNodeId(`node_id must be between 0 and 15. Got: ${node_id}`);
    }
    if (worker_id < 0 || worker_id > 15) {
      throw new InvalidWorkerId(`worker_id must be between 0 and 15. Got: ${worker_id}`);
    }
  }
}
