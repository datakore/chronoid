package io.github.datakore.chronoid;

public class SyncSnowflakeGenerator {
    private final AsyncSnowflakeGenerator asyncGen;
    private final SyncExhaustionStrategy strategy;

    public SyncSnowflakeGenerator(int baseYear, int nodeId, int workerId, SyncExhaustionStrategy strategy) {
        this.strategy = strategy;
        AsyncExhaustionStrategy asyncStrategy = (strategy == SyncExhaustionStrategy.BLOCK) 
            ? AsyncExhaustionStrategy.WAIT_ASYNC 
            : AsyncExhaustionStrategy.THROW;
            
        this.asyncGen = new AsyncSnowflakeGenerator(baseYear, nodeId, workerId, asyncStrategy);
    }

    public SnowflakeId generate() {
        return asyncGen.generateSync();
    }
}
