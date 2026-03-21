# chronoid

> A distributed 64-bit ID generator with calendar-decomposed timestamps — a Snowflake variant offering 256-year range and human-readable time components.

---

## What is chronoid?

**chronoid** is a distributed unique ID generator inspired by Twitter's Snowflake ID scheme. It produces 64-bit, time-sortable, unique IDs suitable for distributed systems — with one key difference in how time is encoded.

Instead of storing a raw millisecond offset from a fixed epoch, chronoid decomposes the timestamp into **human-readable calendar components** — year, day-of-year, minute-of-day, and millisecond-of-minute — packed efficiently into 44 bits.

The result is an ID that is:
- **Time-sortable** — lexicographic order reflects chronological order
- **Human-inspectable** — timestamp components are directly readable from the ID without full decoding
- **Distributed-safe** — node and worker fields ensure uniqueness across a cluster
- **Long-lived** — 256-year range anchored at a configurable base year

---

## An Alternate Thought on Snowflake IDs

Twitter's Snowflake ID is a battle-tested scheme widely adopted across distributed systems. chronoid is not a replacement — it is an **alternate perspective** on one specific aspect: the timestamp encoding.

Snowflake encodes time as a raw millisecond offset from a fixed epoch using 41 bits, giving a range of approximately **69 years**. For most systems, 69 years is more than sufficient. However, the raw offset approach has a minor characteristic worth noting:

- The timestamp is **opaque** — to know what time an ID was generated, you must decode the full offset from the epoch
- The **69-year ceiling** is fixed and non-negotiable without changing the bit layout

chronoid addresses both by decomposing the timestamp into calendar units, extending the range to **256 years** while making the time components directly accessible — without changing the total 64-bit budget.

---

## Bit Layout

See [docs/bit-layout.md](docs/bit-layout.md) for the full layout with ASCII diagram and field-by-field breakdown.

---

## ID Structure at a Glance

| Field | Bits | Description |
|---|---|---|
| Sign | 1 | Reserved, always 0 — ensures BIGINT compatibility |
| Year offset | 8 | Signed offset from base year (-128 to +127) |
| Day of year | 9 | 0–365 (values 367–511 reserved for future extension) |
| Minute of day | 11 | 0–1439 |
| Millisecond of minute | 16 | 0–59999 |
| Node ID | 5 | 0–31 |
| Worker ID | 4 | 0–15 |
| Sequence | 10 | 0–1023 per millisecond |

**Total: 64 bits**

---

## Features

- 📅 **Calendar-decomposed timestamps** — year, day, minute, millisecond directly encoded
- 🕐 **256-year range** with a configurable base year
- 🔢 **Backward compatible** with signed 64-bit integer storage (BIGINT, i64)
- 🌐 **Cluster-ready** — supports 32 nodes × 16 workers (512 total workers)
- ⚡ **1024 IDs per millisecond** per worker
- 🔄 **Three exhaustion strategies** — Throw, WaitAsync, Block
- 📦 **Multiple serialization formats** — decimal, hex, base62
- 🔍 **Human-inspectable** — decode year, day, minute, ms directly from the ID

---

## Language Implementations

| Language | Package | Status |
|---|---|---|
| TypeScript | [`@datakore/chronoid`](../chronoid-ts/) | ✅ Released (v0.1.2) |
| Rust | [`datakore-chronoid`](../chronoid-rs/) | ✅ Released (v0.1.2) |
| Java | [`chronoid`](../chronoid-java/) | ✅ Released (v0.1.2) |

---

## Quick Example

### TypeScript
```typescript
import { SnowflakeGenerator, AsyncExhaustionStrategy } from '@datakore/chronoid';

const generator = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.WaitAsync);
const id = await generator.generate();

console.log(id.to_string());         // decimal string
console.log(id.to_hex());            // hex string
console.log(id.to_base62());         // base62 string
console.log(id.ts_components(2024)); // { year: 2024, day: 180, ... }
```

### Rust
```rust
use datakore_chronoid::{SnowflakeGenerator, AsyncExhaustionStrategy};

let mut generator = SnowflakeGenerator::create(2024, 1, 1, AsyncExhaustionStrategy::WaitAsync)?;
let id = generator.generate().await?;

println!("{}", id.to_string());       // decimal string
println!("{}", id.to_hex());          // hex string
println!("{}", id.to_base62());       // base62 string
println!("{:?}", id.ts_components(2024)); // SnowflakeComponents { year: 2024, ... }
```

### Java
```java
import io.github.datakore.chronoid.*;

AsyncSnowflakeGenerator generator = SnowflakeGenerator.create(2024, 1, 1, AsyncExhaustionStrategy.WAIT_ASYNC);
SnowflakeId id = generator.generate().get();

System.out.println(id.toString());      // decimal string
System.out.println(id.toHex());         // hex string
System.out.println(id.toBase62());      // base62 string
System.out.println(id.getComponents(2024));  // SnowflakeComponents[year=2024, ...]
```

---

## Documentation

- [Overview](overview.md)
- [Bit Layout](bit-layout.md)
- [Interface Specification](interface-spec.md)
- [Exhaustion Strategies](exhaustion-strategies.md)
- [Day Overflow Extension](extension-day-overflow.md)

---

## Repository Structure

```
chronoid/
|-- docs/                   # Language-agnostic documentation
|-- chronoid-ts/            # TypeScript implementation
|-- chronoid-rs/            # Rust implementation
`-- chronoid-java/          # Java implementation
```

---

## License

MIT