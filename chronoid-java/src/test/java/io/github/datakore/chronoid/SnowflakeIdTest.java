package io.github.datakore.chronoid;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.io.*;

class SnowflakeIdTest {

    private long buildId(long yearOffset, long day, long minute, long ms, long node, long worker, long seq) {
        return (yearOffset << 55) | (day << 46) | (minute << 35) | (ms << 19) | (node << 15) | (worker << 11) | seq;
    }

    @Test
    void testComparisonPriority() {
        // Priority: Timestamp > Sequence > (Node + Worker)

        SnowflakeId id1 = new SnowflakeId(buildId(24, 180, 720, 30000, 3, 2, 10)); // Time T, Node 3, Worker 2, Seq 10
        SnowflakeId id2 = new SnowflakeId(buildId(24, 180, 720, 30001, 0, 0, 0));  // Time T+1ms, Node 0, Worker 0, Seq 0
        
        // id2 has later timestamp, so it should be GREATER than id1 despite smaller node/worker/seq
        assertTrue(id2.compareTo(id1) > 0);

        // Same Time, different Sequence
        SnowflakeId id3 = new SnowflakeId(buildId(24, 180, 720, 30000, 10, 10, 5)); // Same T, Node 10, Worker 10, Seq 5
        // id3 has smaller sequence (5 vs 10), so it should be LESS than id1 despite larger node/worker
        assertTrue(id3.compareTo(id1) < 0);

        // Same Time, same Sequence, different Node/Worker
        SnowflakeId id4 = new SnowflakeId(buildId(24, 180, 720, 30000, 3, 1, 5)); // Same T, Node 3, Worker 1, Seq 5
        // id4 has same seq as id3 (5), but smaller worker (1 vs 10)
        assertTrue(id4.compareTo(id3) < 0);
    }

    @Test
    void testSerialization() throws IOException, ClassNotFoundException {
        SnowflakeId original = new SnowflakeId(buildId(24, 180, 720, 30000, 3, 2, 10));
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(baos);
        oos.writeObject(original);
        oos.close();
        
        ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());
        ObjectInputStream ois = new ObjectInputStream(bais);
        SnowflakeId deserialized = (SnowflakeId) ois.readObject();
        
        assertEquals(original, deserialized);
        assertEquals(original.value(), deserialized.value());
    }
}
