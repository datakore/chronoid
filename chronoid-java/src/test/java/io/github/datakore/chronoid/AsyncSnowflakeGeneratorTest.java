package io.github.datakore.chronoid;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.HashSet;
import java.util.Collections;
import static org.junit.jupiter.api.Assertions.*;

public class AsyncSnowflakeGeneratorTest {

    @Test
    void testBasicUniqueness() throws Exception {
        AsyncSnowflakeGenerator generator = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.WAIT_ASYNC);
        HashSet<Long> ids = new HashSet<>();
        for (int i = 0; i < 2000; i++) {
            ids.add(generator.generate().get().value());
        }
        assertEquals(2000, ids.size(), "All IDs must be unique");
    }

    @Test
    void testBenchmarkDetailed() throws Exception {
        // 1. Warm-up phase to let JIT optimize
        AsyncSnowflakeGenerator warmUpGen = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.WAIT_ASYNC);
        for (int i = 0; i < 5000; i++) {
            warmUpGen.generate().get();
        }

        // 2. Multi-threaded Benchmark (100ms Window)
        ExecutorService executor = Executors.newFixedThreadPool(10);
        List<Callable<List<Long>>> tasks = new ArrayList<>();
        long runtimeNanos = 100 * 1_000_000L; // 100ms EXACTLY

        for (int i = 0; i < 10; i++) {
            final int workerId = i;
            AsyncSnowflakeGenerator generator = SnowflakeGenerator.create(2024, 1, workerId, AsyncExhaustionStrategy.WAIT_ASYNC);
            tasks.add(() -> {
                List<Long> ids = new ArrayList<>();
                long start = System.nanoTime();
                while (System.nanoTime() - start < runtimeNanos) {
                    // Optimized path: calling tryGenerate directly to avoid commonPool overhead in a tight benchmark
                    long now = System.currentTimeMillis();
                    SnowflakeId id = generator.tryGenerate(now);
                    if (id != null) {
                        ids.add(id.value());
                    } else {
                        // EXHAUSTED: wait millisecond
                        long target = generator.lastTimestamp + 1;
                        while (System.currentTimeMillis() < target) {
                            Thread.onSpinWait();
                        }
                    }
                }
                return ids;
            });
        }

        List<Future<List<Long>>> futures = executor.invokeAll(tasks);
        HashSet<Long> totalIds = new HashSet<>();
        int totalCount = 0;

        for (int i = 0; i < 10; i++) {
            List<Long> ids = futures.get(i).get();
            System.out.println("Worker " + i + " generated " + ids.size() + " IDs");
            totalCount += ids.size();
            totalIds.addAll(ids);
        }

        executor.shutdown();
        
        System.out.println("Total Count: " + totalCount);
        System.out.println("Unique Size: " + totalIds.size());
        
        assertEquals(totalCount, totalIds.size(), "Must have zero collisions across threads");
        // Target: 1024 IDs/ms * 100ms * 10 workers * 0.3 (safe threshold) = 1,024,000 * 0.3 = 307,200
        assertTrue(totalCount >= 300000, "Throughput below target: " + totalCount);
    }
}
