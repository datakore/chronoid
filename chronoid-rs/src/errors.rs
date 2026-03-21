use thiserror::Error;

#[derive(Error, Debug)]
pub enum ChronoidError {
    #[error("Invalid Node ID: {0}")]
    InvalidNodeId(u32),

    #[error("Invalid Worker ID: {0}")]
    InvalidWorkerId(u32),

    #[error("Sequence exhausted for current millisecond")]
    SequenceExhausted,

    #[error("Invalid snowflake ID: {0}")]
    InvalidId(String),

    #[error("Failed to parse snowflake ID: {0}")]
    ParseError(String),
}

pub type Result<T> = std::result::Result<T, ChronoidError>;
