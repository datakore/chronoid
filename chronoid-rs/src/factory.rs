use crate::async_generator::AsyncSnowflakeGenerator;
use crate::sync_generator::SyncSnowflakeGenerator;
use crate::types::{AsyncExhaustionStrategy, SyncExhaustionStrategy};
use crate::errors::{ChronoidError, Result};

pub struct SnowflakeGenerator;

impl SnowflakeGenerator {
    pub fn create(
        base_year: i32,
        node_id: u32,
        worker_id: u32,
        strategy: AsyncExhaustionStrategy,
    ) -> Result<AsyncSnowflakeGenerator> {
        Self::validate_config(base_year, node_id, worker_id)?;
        Ok(AsyncSnowflakeGenerator::new(base_year, node_id, worker_id, strategy))
    }

    pub fn create_sync(
        base_year: i32,
        node_id: u32,
        worker_id: u32,
        strategy: SyncExhaustionStrategy,
    ) -> Result<SyncSnowflakeGenerator> {
        Self::validate_config(base_year, node_id, worker_id)?;
        Ok(SyncSnowflakeGenerator::new(base_year, node_id, worker_id, strategy))
    }

    fn validate_config(base_year: i32, node_id: u32, worker_id: u32) -> Result<()> {
        if base_year < 1900 || base_year > 2200 {
            return Err(ChronoidError::InvalidId(format!(
                "base_year must be between 1900 and 2200. Got: {base_year}"
            )));
        }
        if node_id > 31 {
            return Err(ChronoidError::InvalidNodeId(node_id));
        }
        if worker_id > 15 {
            return Err(ChronoidError::InvalidWorkerId(worker_id));
        }
        Ok(())
    }
}
