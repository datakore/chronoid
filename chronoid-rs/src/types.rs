use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SnowflakeComponents {
    pub year: i32,
    pub day: u32,
    pub minute: u32,
    pub millisecond: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AsyncExhaustionStrategy {
    WaitAsync,
    Throw,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncExhaustionStrategy {
    Block,
    Throw,
}
