use datakore_chronoid::{SnowflakeGenerator, AsyncExhaustionStrategy};
use std::time::{Duration, Instant};
use std::collections::HashSet;
use std::fs::File;
use std::io::Write;

#[tokio::test]
async fn test_exhaustive_512_worker_uniqueness() {
    let mut handlers = vec![];
    let runtime = Duration::from_millis(10);
    
    // Launch all 512 possible (Node, Worker) combinations!
    // 32 Nodes * 16 Workers = 512 unique identities
    for node in 0..32 {
        for worker in 0..16 {
            let mut generator = SnowflakeGenerator::create(2024, node, worker, AsyncExhaustionStrategy::WaitAsync).unwrap();
            let handle = tokio::spawn(async move {
                let mut ids = Vec::new();
                let start = Instant::now();
                while start.elapsed() < runtime {
                    if let Ok(id) = generator.generate().await {
                        ids.push(id.to_raw_u64());
                    }
                }
                ids
            });
            handlers.push(handle);
        }
    }

    let mut total_ids = HashSet::new();
    let mut total_count = 0;
    let mut collisions = Vec::new();

    for (i, h) in handlers.into_iter().enumerate() {
        let worker_ids = h.await.unwrap();
        total_count += worker_ids.len();
        for id in worker_ids {
            if !total_ids.insert(id) {
                // If it collides, we capture the ID to prove it clashed cross-worker!
                collisions.push(format!("Worker-Pair {} duplicated ID: {}", i, id));
            }
        }
    }

    let mut log = File::create("exhaustive_collision_report.log").unwrap();
    writeln!(log, "Total ID Count: {}", total_count).unwrap();
    writeln!(log, "Unique Set Size: {}", total_ids.len()).unwrap();
    writeln!(log, "Number of Collisions: {}", collisions.len()).unwrap();
    
    // Only print first few collisions to avoid huge log files
    for c in collisions.iter().take(10) {
        writeln!(log, "{}", c).unwrap();
    }

    assert_eq!(total_count, total_ids.len(), "COLLISIONS DETECTED across 512 nodes! Check exhaustive_collision_report.log");
    println!("SUCCESS: Processed {} unique identifiers from 512 concurrent nodes with 0 collisions!", total_count);
}
