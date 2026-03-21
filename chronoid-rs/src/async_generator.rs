use crate::id::SnowflakeId;
use crate::types::AsyncExhaustionStrategy;
use crate::errors::{ChronoidError, Result};
use chrono::{Utc, Datelike, TimeZone};
use tokio::time::{sleep, Duration};

pub struct AsyncSnowflakeGenerator {
    pub(crate) base_year: i32,
    pub(crate) node_id: u32,
    pub(crate) worker_id: u32,
    pub(crate) strategy: AsyncExhaustionStrategy,
    pub(crate) last_timestamp: i64,
    pub(crate) sequence: u32,
    // Caching
    cached_prefix: u64,
    cached_next_year_ms: i64,
    cached_start_of_year_ms: i64,
    cached_year_offset: u64,
}

impl AsyncSnowflakeGenerator {
    pub(crate) fn new(
        base_year: i32,
        node_id: u32,
        worker_id: u32,
        strategy: AsyncExhaustionStrategy,
    ) -> Self {
        Self {
            base_year,
            node_id,
            worker_id,
            strategy,
            last_timestamp: -1,
            sequence: 0,
            cached_prefix: 0,
            cached_next_year_ms: 0,
            cached_start_of_year_ms: 0,
            cached_year_offset: 0,
        }
    }

    pub fn try_generate(&mut self, now_ms: i64) -> Result<Option<SnowflakeId>> {
        if now_ms < self.last_timestamp {
            return Err(ChronoidError::InvalidId(format!(
                "Clock moved backwards. Refusing to generate for {}ms",
                self.last_timestamp - now_ms
            )));
        }

        if now_ms == self.last_timestamp && self.last_timestamp != -1 {
            if self.sequence >= 2047 {
                return Ok(None); // EXHAUSTED
            }
            self.sequence += 1;
            return Ok(Some(SnowflakeId::from_u64((self.sequence as u64) | self.cached_prefix)?));
        }

        self.sequence = 0;
        self.last_timestamp = now_ms;

        // Caching logic
        if now_ms >= self.cached_next_year_ms {
            let dt = Utc.timestamp_millis_opt(now_ms).unwrap();
            let yr = dt.year();
            self.cached_year_offset = ((yr - self.base_year) as u64 & 0xFF) << 55;
            
            let start = Utc.with_ymd_and_hms(yr, 1, 1, 0, 0, 0).unwrap();
            let end = Utc.with_ymd_and_hms(yr + 1, 1, 1, 0, 0, 0).unwrap();
            
            self.cached_start_of_year_ms = start.timestamp_millis();
            self.cached_next_year_ms = end.timestamp_millis();
        }

        let day = ((now_ms - self.cached_start_of_year_ms) / 86400000) as u64;
        let minute = ((now_ms / 60000) % 1440) as u64;
        let millisecond = (now_ms % 60000) as u64;
        let node = (self.node_id as u64) << 15;
        let worker = (self.worker_id as u64) << 11;

        self.cached_prefix = worker 
            | node 
                           | (millisecond << 19) 
                           | (minute << 35) 
                           | (day << 46) 
                           | self.cached_year_offset;

        Ok(Some(SnowflakeId::from_u64(self.cached_prefix)?))
    }

    pub async fn generate(&mut self) -> Result<SnowflakeId> {
        loop {
            let now_ms = Utc::now().timestamp_millis();
            match self.try_generate(now_ms)? {
                Some(id) => return Ok(id),
                None => {
                    match self.strategy {
                        AsyncExhaustionStrategy::Throw => {
                            return Err(ChronoidError::SequenceExhausted);
                        }
                        AsyncExhaustionStrategy::WaitAsync => {
                            let now = Utc::now();
                            let now_nanos = now.timestamp_nanos_opt().unwrap_or(now.timestamp_millis() * 1_000_000);
                            let target_nanos = (self.last_timestamp + 1) * 1_000_000;
                            
                            if target_nanos > now_nanos {
                                let diff_nanos = (target_nanos - now_nanos) as u64;
                                // If the wait is very short (less than 1ms), just yield the task to the back of the queue.
                                // This is significantly faster than a kernel-level sleep on Windows.
                                if diff_nanos < 1_000_000 {
                                    tokio::task::yield_now().await;
                                } else {
                                    sleep(Duration::from_nanos(diff_nanos)).await;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
