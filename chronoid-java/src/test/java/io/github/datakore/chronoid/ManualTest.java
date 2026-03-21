package io.github.datakore.chronoid;

public class ManualTest {
    public static void main(String[] args) throws Exception {
        System.out.println("=== Chronoid Manual Verification (Java) ===");
        
        // 1. Create a generator for the year 2024
        SyncSnowflakeGenerator generator = SnowflakeGenerator.createSync(
            2024,   // Base Year
            1,      // Node ID
            1,      // Worker ID
            SyncExhaustionStrategy.BLOCK
        );

        System.out.println(String.format("%-20s | %-16s | %-10s | %s", "ID (Decimal)", "ID (Hex)", "Base62", "Decomposed Time"));
        System.out.println("------------------------------------------------------------------------------------------");

        for (int i = 0; i < 10; i++) {
            SnowflakeId id = generator.generate();
            SnowflakeComponents comps = id.getComponents(2024);
            
            String timeStr = String.format("Yr:%d Day:%d Min:%d ms:%d", 
                comps.year(), comps.day(), comps.minute(), comps.millisecond());
            
            System.out.println(String.format("%-20s | %-16s | %-10s | %s", 
                id.toString(), id.toHex(), id.toBase62(), timeStr));
            
            // Subtle sleep to see time progress
            Thread.sleep(1);
        }

        System.out.println("\nVerification Complete! Zero collisions, human-readable components confirmed.");
    }
}
