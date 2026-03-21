# Interface Specification

This document defines the canonical, language-agnostic interface for chronoid. All language implementations — TypeScript, Rust, Java — must conform to this specification. Language-specific idioms are permitted for naming conventions and error handling, but the **semantics must remain identical**.

---

## Entities

chronoid exposes three primary entities:

| Entity | Role |
|---|---|
| `SnowflakeGenerator` | Static factory — produces generator instances |
| `AsyncSnowflakeGenerator` | Stateful async ID generator |
| `SyncSnowflakeGenerator` | Stateful sync ID generator, wraps async internally |
| `SnowflakeId` | Value object — wraps the 64-bit ID, exposes accessors |
| `SnowflakeComponents` | Plain data — decoded timestamp components |
| `AsyncExhaustionStrategy` | Enum — strategy for async generator on sequence exhaustion |
| `SyncExhaustionStrategy` | Enum — strategy for sync generator on sequence exhaustion |

---

## Enumerations

### `AsyncExhaustionStrategy`

Controls behavior of `AsyncSnowflakeGenerator` when the sequence counter exhausts within a millisecond.

| Variant | Behavior |
|---|---|
| `Throw` | Immediately return an error — do not wait |
| `WaitAsync` | Asynchronously wait until the next millisecond, then generate |

---

### `SyncExhaustionStrategy`

Controls behavior of `SyncSnowflakeGenerator` when the sequence counter exhausts within a millisecond.

| Variant | Behavior |
|---|---|
| `Throw` | Immediately return an error — do not wait |
| `Block` | Synchronously block until the next millisecond, then generate |

---

## `SnowflakeGenerator` (Static Factory)

Responsible for constructing and validating generator instances. All construction is **fallible** — invalid configuration produces an error.

### Methods

```
create(base_year: i16, node_id: u8, worker_id: u8, strategy: AsyncExhaustionStrategy)
    → Result<AsyncSnowflakeGenerator>

create_sync(base_year: i16, node_id: u8, worker_id: u8, strategy: SyncExhaustionStrategy)
    → Result<SyncSnowflakeGenerator>
```

### Validation Rules

| Parameter | Valid Range | Error if violated |
|---|---|---|
| `node_id` | 0 – 31 | `InvalidNodeId` |
| `worker_id` | 0 – 15 | `InvalidWorkerId` |
| `base_year` | any i16 | — (no restriction) |

### Notes
- `SyncSnowflakeGenerator` internally delegates to an `AsyncSnowflakeGenerator` and blocks on the async runtime.
- The factory is the **only** way to construct generators — no public constructors.

---

## `AsyncSnowflakeGenerator`

Stateful generator for asynchronous contexts.

### State
- `base_year: i16`
- `node_id: u8`
- `worker_id: u8`
- `strategy: AsyncExhaustionStrategy`
- `last_timestamp` — last millisecond at which an ID was generated (internal)
- `sequence` — current sequence counter (internal)

### Methods

```
generate() → Future<Result<SnowflakeId>>
```

### Behavior
1. Capture current calendar timestamp (year offset, day, minute, millisecond of minute)
2. If timestamp is same as `last_timestamp`, increment sequence
3. If sequence exceeds 1023:
   - `Throw` → return `SequenceExhausted` error
   - `WaitAsync` → async-wait until next millisecond, reset sequence, generate
4. If timestamp advanced, reset sequence to 0
5. Pack all fields into a 64-bit ID and return as `SnowflakeId`

---

## `SyncSnowflakeGenerator`

Stateful generator for synchronous contexts. Wraps `AsyncSnowflakeGenerator` internally.

### Methods

```
generate() → Result<SnowflakeId>
```

### Behavior
- Identical to `AsyncSnowflakeGenerator.generate()` with:
  - `WaitAsync` replaced by `Block` (synchronous sleep until next ms)
  - No async runtime required by the caller

---

## `SnowflakeId`

Immutable value object wrapping a 64-bit ID. Supports comparison, serialization, and field access.

### Construction

```
from(value: i64) → Result<SnowflakeId>
from_string(value: string) → Result<SnowflakeId>
```

`from_string` parses a decimal string representation and delegates to `from`.

### Validation on Construction
- Sign bit (bit 63) must be `0`
- Day field must be in range 0–365
- Minute field must be in range 0–1439
- Millisecond field must be in range 0–59999
- Node ID must be in range 0–31
- Worker ID must be in range 0–15

### Serialization

```
to_string()  → string    // decimal representation
to_hex()     → string    // hexadecimal representation, lowercase, 0x-prefixed
to_base62()  → string    // base62 encoded, URL-safe
```

### Field Accessors

```
node()          → u8     // 0 – 31
worker()        → u8     // 0 – 15
sequence()      → u16    // 0 – 1023
ts_components() → TsComponents
```

### Comparability

`SnowflakeId` must support **total ordering** — two IDs must be comparable by their raw 64-bit value. Since the timestamp occupies the most significant bits, ordering is **chronological first**, then by node, worker, and sequence.

### Serializability

`SnowflakeId` must support serialization to and deserialization from the platform's standard serialization format:

| Language | Format |
|---|---|
| TypeScript | `JSON.stringify` / `JSON.parse` compatible |
| Rust | `serde::Serialize` / `serde::Deserialize` |
| Java | `java.io.Serializable` + JSON via standard library |

---

## `SnowflakeComponents`

Plain immutable data object representing the decoded timestamp fields of a `SnowflakeId`.

### Fields

```
year:        i16    // actual year = base_year + offset; e.g. 2024
day:         u16    // day of year, 0-indexed, 0 – 365
minute:      u16    // minute of day, 0 – 1439
millisecond: u16    // millisecond of minute, 0 – 59999
```

### Notes
- `year` is the **actual calendar year**, not the offset — the offset is resolved at decode time using the generator's `base_year`.
- `SnowflakeComponents` is a **read-only data bag** — no methods beyond field access.

---

## Error Types

All errors should be represented as typed variants, not raw strings.

| Error | Produced by | Meaning |
|---|---|---|
| `InvalidNodeId` | `create` | `node_id` out of range 0–31 |
| `InvalidWorkerId` | `create` | `worker_id` out of range 0–15 |
| `SequenceExhausted` | `generate()` | Sequence exhausted and strategy is `Throw` |
| `InvalidId` | `from` | Bit fields fail validation |
| `ParseError` | `from_string` | Input string is not a valid decimal integer |

---

## Language Mapping Notes

### TypeScript
- `i64` → `bigint`
- `u8`, `u16` → `number`
- `Future<Result<T>>` → `Promise<T>` (throw on error)
- `SnowflakeComponents` → returned as plain object or record

### Rust
- `Future<Result<T>>` → `async fn` returning `Result<T, ChronoidError>`
- `SnowflakeComponents` → `struct`
- Comparability → `PartialOrd`, `Ord`
- `from(i64)` → `TryFrom<i64>` trait

### Java
- `i64` → `long`
- `u8` → `int` (range validated)
- `Future<Result<T>>` → `CompletableFuture<SnowflakeId>` (exception on error)
- `SnowflakeComponents` → `record`
- Comparability → `Comparable<SnowflakeId>`
- Serializability → `Serializable`
- Naming → Uses idiomatic **CamelCase** for all methods.

---

## Invariants

These invariants must hold across all implementations:

1. An ID generated by worker A will always sort **before** an ID generated by worker B if A's timestamp is earlier than B's — regardless of node or worker assignment.
2. Two IDs generated in the **same millisecond** by the **same worker** will have different sequence values.
3. `SnowflakeId.from(id.to_raw_i64())` must always roundtrip cleanly.
4. `ts_components().year` must equal `base_year + year_offset_bits`.
5. Sign bit is always `0` — IDs are always positive when interpreted as signed 64-bit integers.