use datakore_chronoid::{SnowflakeGenerator, AsyncExhaustionStrategy};
use std::time::{Duration, Instant};
use std::collections::HashSet;

#[tokio::test]
async fn test_exhaustive_256_worker_uniqueness() {
    let mut handlers = vec![];
    let runtime = Duration::from_millis(10);
    
    for node in 0..16 {
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
    for h in handlers {
        let worker_ids = h.await.unwrap();
        total_count += worker_ids.len();
        for id in worker_ids {
            total_ids.insert(id);
        }
    }
    assert_eq!(total_count, total_ids.len());
    println!("SUCCESS: Processed {} unique identifiers from 256 concurrent nodes with 0 collisions!", total_count);
}

#[tokio::test]
async fn test_benchmark_10_workers_100ms() {
    let mut handlers = vec![];
    let runtime = Duration::from_millis(100);
    
    for worker in 0..10 {
        let mut generator = SnowflakeGenerator::create(2024, 1, worker, AsyncExhaustionStrategy::WaitAsync).unwrap();
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

    let mut total_ids = HashSet::new();
    let mut total_count = 0;
    for h in handlers {
        let worker_ids = h.await.unwrap();
        total_count += worker_ids.len();
        for id in worker_ids {
            total_ids.insert(id);
        }
    }

    println!("RUST_BENCHMARK_TOTAL: {}", total_count);
    assert_eq!(total_count, total_ids.len());
}
