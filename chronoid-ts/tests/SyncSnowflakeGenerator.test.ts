import { describe, it, expect, vi } from 'vitest';
import { SnowflakeGenerator } from '../src/SnowflakeGenerator.js';
import { SyncExhaustionStrategy } from '../src/types.js';
import { SequenceExhausted } from '../src/errors.js';

describe('SyncSnowflakeGenerator', () => {
    it('should cleanly execute and sequence ID', () => {
        const generator = SnowflakeGenerator.create_sync(2020, 2, 5, SyncExhaustionStrategy.Throw);
        const id = generator.generate();

        expect(id.node()).toBe(2);
        expect(id.worker()).toBe(5);
        expect(id.sequence()).toBe(0);

        const nextId = generator.generate();
        expect(nextId.sequence()).toBeGreaterThanOrEqual(0);
    });

    it('should physically throw when exhausted within the same ms', () => {
        const generator = SnowflakeGenerator.create_sync(2020, 2, 5, SyncExhaustionStrategy.Throw);

        vi.spyOn(Date, 'now').mockReturnValue(123456789);
        let threw = false;
        try {
            for (let i = 0; i < 1100; i++) {
                generator.generate();
            }
        } catch (e) {
            if (e instanceof SequenceExhausted) {
                threw = true;
            }
        } finally {
            vi.restoreAllMocks();
        }
        expect(threw).toBe(true);
    });

    it('should successfully spin-lock under Block strategy when exhausting', () => {
        const generator = SnowflakeGenerator.create_sync(2020, 2, 5, SyncExhaustionStrategy.Block);

        const ids = new Set<bigint>();
        // 1100 generations synchronously will hit 1024 identically, spin-lock identically until the timer ticks, and then run the remaining cleanly
        for (let i = 0; i < 1100; i++) {
            ids.add(generator.generate().to_raw_i64());
        }
        expect(ids.size).toBe(1100);
    });
});
