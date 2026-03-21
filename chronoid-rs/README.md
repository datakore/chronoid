
## What is chronoid?

**chronoid** is a distributed unique ID generator inspired by Twitter's Snowflake ID scheme. It produces 64-bit, time-sortable, unique IDs suitable for distributed systems — with one key difference in how time is encoded.

Instead of storing a raw millisecond offset from a fixed epoch, chronoid decomposes the timestamp into **human-readable calendar components** — year, day-of-year, minute-of-day, and millisecond-of-minute — packed efficiently into 44 bits.

The result is an ID that is:
- **Time-sortable** — lexicographic order reflects chronological order
- **Human-inspectable** — timestamp components are directly readable from the ID without full decoding
- **Distributed-safe** — node and worker fields ensure uniqueness across a cluster
- **Long-lived** — 256-year range anchored at a configurable base year

---
# Getting Started

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
        2024, 
        1, 
        1, 
        AsyncExhaustionStrategy::WaitAsync
    )?;
    
    let id = generator.generate().await?;

    println!("{}", id.to_string());       // decimal
    println!("{}", id.to_hex());          // hex
    println!("{}", id.to_base62());       // base62
    println!("{:?}", id.ts_components(2024)); // SnowflakeComponents { ... }
    
    Ok(())
}
```
---

## License

MIT