package io.github.datakore.chronoid;

public class SnowflakeGenerator {
    private SnowflakeGenerator() {}

    public static AsyncSnowflakeGenerator create(
        int baseYear,
        int nodeId,
        int workerId,
        AsyncExhaustionStrategy strategy
    ) {
        validateConfig(baseYear, nodeId, workerId);
        return new AsyncSnowflakeGenerator(baseYear, nodeId, workerId, strategy);
    }

    public static SyncSnowflakeGenerator createSync(
        int baseYear,
        int nodeId,
        int workerId,
        SyncExhaustionStrategy strategy
    ) {
        validateConfig(baseYear, nodeId, workerId);
        return new SyncSnowflakeGenerator(baseYear, nodeId, workerId, strategy);
    }

    private static void validateConfig(int baseYear, int nodeId, int workerId) {
        if (baseYear < 1900 || baseYear > 2200) {
            throw new ChronoidException.InvalidId("baseYear must be between 1900 and 2200. Got: " + baseYear);
        }
        if (nodeId < 0 || nodeId > 15) {
            throw new ChronoidException.InvalidId("nodeId must be between 0 and 15. Got: " + nodeId);
        }
        if (workerId < 0 || workerId > 15) {
            throw new ChronoidException.InvalidId("workerId must be between 0 and 15. Got: " + workerId);
        }
    }
}
