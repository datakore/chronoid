package io.github.datakore.chronoid;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CompletableFuture;

public class AsyncSnowflakeGenerator {
    private final int baseYear;
    private final int nodeId;
    private final int workerId;
    private final AsyncExhaustionStrategy strategy;

    long lastTimestamp = -1;
    int sequence = 0;

    // Caching
    private long cachedPrefix = 0;
    private long cachedNextYearMs = 0;
    private long cachedStartOfYearMs = 0;
    private long cachedYearOffset = 0;

    public AsyncSnowflakeGenerator(int baseYear, int nodeId, int workerId, AsyncExhaustionStrategy strategy) {
        this.baseYear = baseYear;
        this.nodeId = nodeId;
        this.workerId = workerId;
        this.strategy = strategy;
    }

    public synchronized SnowflakeId tryGenerate(long nowMs) {
        if (nowMs < lastTimestamp) {
            throw new ChronoidException.InvalidId("Clock moved backwards. Refusing to generate for " + (lastTimestamp - nowMs) + "ms");
        }

        if (nowMs == lastTimestamp && lastTimestamp != -1) {
            if (sequence >= 1023) {
                return null; // EXHAUSTED
            }
            sequence++;
            return new SnowflakeId(((long) sequence) | cachedPrefix);
        }

        // New millisecond
        sequence = 0;
        lastTimestamp = nowMs;

        if (nowMs >= cachedNextYearMs) {
            LocalDateTime dt = LocalDateTime.ofEpochSecond(nowMs / 1000, (int) ((nowMs % 1000) * 1_000_000), ZoneOffset.UTC);
            int yr = dt.getYear();
            cachedYearOffset = ((long) (yr - baseYear) & 0xFFL) << 55;

            LocalDateTime start = LocalDateTime.of(yr, 1, 1, 0, 0, 0);
            LocalDateTime end = LocalDateTime.of(yr + 1, 1, 1, 0, 0, 0);
            cachedStartOfYearMs = start.toInstant(ZoneOffset.UTC).toEpochMilli();
            cachedNextYearMs = end.toInstant(ZoneOffset.UTC).toEpochMilli();
        }

        long day = (nowMs - cachedStartOfYearMs) / 86400000L;
        long minute = (nowMs / 60000L) % 1440L;
        long millisecond = nowMs % 60000L;
        long node = (long) nodeId << 14;
        long worker = (long) workerId << 10;

        cachedPrefix = worker 
                     | node 
                     | (millisecond << 19) 
                     | (minute << 35) 
                     | (day << 46) 
                     | cachedYearOffset;

        return new SnowflakeId(cachedPrefix);
    }

    /**
     * Primary generation engine with high-precision yielding.
     * This method is the unified polling loop for both Async and Sync paths.
     */
    private SnowflakeId internalGenerate() {
        while (true) {
            long nowMs = System.currentTimeMillis();
            SnowflakeId id = tryGenerate(nowMs);
            if (id != null) return id;

            if (strategy == AsyncExhaustionStrategy.THROW) {
                throw new ChronoidException.SequenceExhausted();
            }

            // High-precision non-blocking wait until the next millisecond boundary
            long targetMs = lastTimestamp + 1;
            while (System.currentTimeMillis() < targetMs) {
                // Hint to the CPU that we are in a tight spin loop for micro-latency
                Thread.onSpinWait();
            }
        }
    }

    public CompletableFuture<SnowflakeId> generate() {
        return CompletableFuture.supplyAsync(this::internalGenerate);
    }

    /**
     * Optimized blocking generator for synchronous performance.
     */
    public SnowflakeId generateSync() {
        return internalGenerate();
    }
}
