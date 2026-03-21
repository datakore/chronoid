# chronoid (v2)

> A distributed 64-bit ID generator with calendar-decomposed timestamps — a Snowflake variant offering 256-year range, human-readable time components, and prioritized chronological sorting.

---

## What is chronoid?

**chronoid** is a distributed unique ID generator inspired by Twitter's Snowflake ID scheme. It produces 64-bit, unique IDs suitable for distributed systems with a focus on longevity and inspectability.

Instead of a raw offset, chronoid decomposes time into **human-readable calendar components** — year, day, minute, and millisecond — packed into 44 bits.

The result is an ID that is:
- **Lexicographically Sortable** — optimized for chronological order across nodes
- **Human-inspectable** — timestamp components are directly readable from bitmasking
- **Century-Durable** — 256-year range anchored at a configurable base year
- **Burst-Safe** — supports 2,048 IDs per millisecond per process

---

## ID Structure at a Glance (v2)

| Field | Bits | Description |
|---|---|---|
| Sign | 1 | Reserved (0) for BIGINT compatibility |
| Year offset | 8 | Signed offset from base year (256 years total) |
| Day of year | 9 | 0–365 |
| Minute of day | 11 | 0–1,439 |
| Millisecond of minute | 16 | 0–59,999 |
| Node ID | 4 | Up to 16 clusters/nodes |
| Worker ID | 4 | Up to 16 workers per node |
| Sequence | 11 | 0–2,047 per millisecond |

**Total: 64 bits**

---

## Comparison Priority
Chronoid implements a custom comparison priority to ensure robust chronological ordering even across distributed nodes:
1. **Timestamp** (Highest Priority)
2. **Sequence Number** (Within same MS)
3. **Node/Worker ID** (Tie-breaker)

This ensures that if two nodes generate IDs in the same millisecond, they interleave according to their local generation order before falling back to node hierarchy.

---

## Features

- 📅 **Calendar timestamps** — year, day, minute, millisecond directly encoded
- 🕐 **256-year range** with configurable base year
- 🔢 **Natively sortable** as signed 64-bit integers
- ⚡ **2,048 IDs per millisecond** per worker
- 🔄 **Consistency** across TypeScript, Rust, and Java

---

## Documentation

- [Bit Layout](bit-layout.md)
- [Benchmark Results](benchmark-results.md)
- [Exhaustion Strategies](exhaustion-strategies.md)

---

## License

MIT