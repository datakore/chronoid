import { describe, it, expect, vi } from 'vitest';
import { SnowflakeGenerator } from '../src/SnowflakeGenerator.js';
import { AsyncExhaustionStrategy } from '../src/types.js';
import { SequenceExhausted } from '../src/errors.js';

describe('AsyncSnowflakeGenerator', () => {
    it('should generate valid distinct IDs in a tight loop', async () => {
        const generator = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.Throw);
        const id1 = await generator.generate();
        const id2 = await generator.generate();

        expect(id1.to_raw_i64()).not.toBe(id2.to_raw_i64());
    });

    it('should throw when sequence exceeds 2047 under Throw strategy', async () => {
        const generator = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.Throw);

        // Freeze time linearly so our loop mathematically forces boundary exhaustion regardless of JS engine execution speed
        vi.spyOn(Date, 'now').mockReturnValue(123456789);

        let threw = false;
        try {
            for (let i = 0; i < 2100; i++) {
                await generator.generate();
            }
        } catch (err) {
            if (err instanceof SequenceExhausted) {
                threw = true;
            }
        } finally {
            vi.restoreAllMocks();
        }
        expect(threw).toBe(true);
    });

    it('should wait efficiently under WaitAsync strategy without throwing', async () => {
        const generator = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.WaitAsync);

        // Push 2100 rapid calls. The first 2048 should execute instantaneously. 
        // Calls over 2048 will await the next ms tick seamlessly without erroring!
        const ids = new Set<bigint>();
        for (let i = 0; i < 2100; i++) {
            const id = await generator.generate();
            ids.add(id.to_raw_i64());
        }

        // Set uniquely holds items, ensuring zero duplicates!
        expect(ids.size).toBe(2100);
    });

    // Validating your scenario: 10 simulated parallel worker loops generating dynamically for 100ms natively
    it('should generate continuously via 10 diff workers for 100ms', async () => {
        const workers = Array.from({ length: 10 }).map((_, i) =>
            // We assign 'i' as the worker_id dynamically representing 0 through 9
            SnowflakeGenerator.create(1975, 1, i, AsyncExhaustionStrategy.WaitAsync)
        );

        const allIds = new Set<bigint>();
        const endTime = Date.now() + 100;

        // Create an asynchronous generator loop structure
        const runWorker = async (gen: any) => {
            while (Date.now() < endTime) {
                const id = await gen.generate();
                allIds.add(id.to_raw_i64());
            }
        };

        // Fire all 10 worker loops into the JS event loop concurrently via Promise.All!
        await Promise.all(workers.map(w => runWorker(w)));

        console.log(`TS_BENCHMARK_TOTAL: ${allIds.size}`);
        expect(allIds.size).toBeGreaterThan(0);
    });
});
