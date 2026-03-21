use crate::id::SnowflakeId;
use crate::types::{SyncExhaustionStrategy, AsyncExhaustionStrategy};
use crate::async_generator::AsyncSnowflakeGenerator;
use crate::errors::{ChronoidError, Result};
use chrono::Utc;

pub struct SyncSnowflakeGenerator {
    async_gen: AsyncSnowflakeGenerator,
    strategy: SyncExhaustionStrategy,
}

impl SyncSnowflakeGenerator {
    pub(crate) fn new(
        base_year: i32,
        node_id: u32,
        worker_id: u32,
        strategy: SyncExhaustionStrategy,
    ) -> Self {
        Self {
            async_gen: AsyncSnowflakeGenerator::new(base_year, node_id, worker_id, AsyncExhaustionStrategy::Throw),
            strategy,
        }
    }

    pub fn generate(&mut self) -> Result<SnowflakeId> {
        loop {
            let now_ms = Utc::now().timestamp_millis();
            match self.async_gen.try_generate(now_ms)? {
                Some(id) => return Ok(id),
                None => {
                    match self.strategy {
                        SyncExhaustionStrategy::Throw => {
                            return Err(ChronoidError::SequenceExhausted);
                        }
                        SyncExhaustionStrategy::Block => {
                            // Synchronous spin-lock/busy-wait
                            while Utc::now().timestamp_millis() <= self.async_gen.last_timestamp {
                                std::hint::spin_loop();
                            }
                        }
                    }
                }
            }
        }
    }
}
