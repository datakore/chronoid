# chronoid (v2)

> A distributed 64-bit ID generator with calendar-decomposed timestamps — offering 256-year range, human-readable components, and high-burst capacity.

---

## Features

- 📅 **Calendar timestamps** — year, day, minute, millisecond directly encoded
- 🕐 **256-year range** with configurable base year
- 🔢 **Natively sortable** — optimized chronological sorting across different nodes
- ⚡ **2,048 IDs per millisecond** per worker (2 Million IDs/sec)
- 🌐 **Distributed-safe** — Node/Worker fields ensure uniqueness across 256 concurrent processes
- 📦 **Cross-platform** — Native implementations for Rust, Java, and TypeScript

---

## ID Structure (v2)

| Field | Bits | Range |
|---|---|---|
| **Sign** | 1 | always 0 |
| **Time** | 44 | 256 Years (decomposed) |
| **Node** | 4 | 0–15 |
| **Worker** | 4 | 0–15 |
| **Sequence** | 11 | 0–2047 |

---

## Language Implementations

| Language | Package | Throughput (100ms) |
|---|---|---|
| **Rust** | [`datakore-chronoid`](chronoid-rs/) | **1.17M IDs** |
| **Java** | `chronoid` | **913k IDs** |
| **TypeScript** | `@datakore/chronoid` | **102k IDs** |

---

## Quick Example (Rust)
```rust
use datakore_chronoid::{SnowflakeGenerator, AsyncExhaustionStrategy};

let mut generator = SnowflakeGenerator::create(2024, 1, 1, AsyncExhaustionStrategy::WaitAsync)?;
let id = generator.generate().await?;

println!("ID: {}", id.to_string());
```

---

## Documentation

- [Full Bit Layout](docs/bit-layout.md)
- [Benchmark Results](docs/benchmark-results.md)
- [Snowflake Comparison](docs/comparison-snowflake.md)

---

## License

MIT