# chronoid-rs (v2)

Rust implementation of the Chronoid distributed 64-bit ID generator.

## Features (v2)
- **High Performance**: **1.17 Million IDs per 100ms** on local benchmarks.
- **Enhanced Burst Capacity**: **2,048 IDs/ms** per process (up from 1,024).
- **Consolidated Node/Worker ID**: Support for 256 concurrent processes (16 Nodes × 16 Workers).
- **Custom Sortability**: Custom `Ord` and `PartialOrd` implementation (Timestamp > Sequence > Node/Worker).
- **Zero-Copy**: Minimal memory footprint using native bitwise operations.

## Installation
```bash
cargo add datakore-chronoid
```

## Usage
```rust
use datakore_chronoid::{SnowflakeGenerator, AsyncExhaustionStrategy};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut generator = SnowflakeGenerator::create(
        2024,                        // base year
        1,                           // node ID (0-15)
        1,                           // worker ID (0-15)
        AsyncExhaustionStrategy::WaitAsync
    )?;
    
    let id = generator.generate().await?;
    println!("ID: {}", id.to_string());
    println!("Hex: {}", id.to_hex());
    
    Ok(())
}
```

## License
MIT