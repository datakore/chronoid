# Bit Layout

This document describes the 64-bit ID layout used by chronoid, contrasted against the original Snowflake ID scheme.

---

## Original Snowflake Layout (Twitter, 2010)

```
 63                                                              0
  +--+--------------------------------------------+-----+-----+----------+
  |S |         Timestamp (41 bits)                | NID | WID | Sequence |
  |  |    milliseconds since fixed epoch          |(5b) |(5b) |  (10b)   |
  +--+--------------------------------------------+-----+-----+----------+
   1                   41                            5     5       10
```

| Field | Bits | Range | Notes |
|---|---|---|---|
| Sign | 1 | 0 | Always 0, reserved |
| Timestamp | 41 | 0 – 2^41 | ms offset from fixed epoch (~69 years) |
| Node ID | 5 | 0 – 31 | Physical machine identifier |
| Worker ID | 5 | 0 – 31 | Process/thread within node |
| Sequence | 10 | 0 – 1023 | Per-ms counter per worker |

**Total: 64 bits**
**Timestamp range: ~69 years from epoch**
**Max workers: 32 nodes × 32 workers = 1024**
**Max IDs/ms/worker: 1023**

---

## chronoid Layout

```
 63                                                                       0
  +--+--------+---------+-----------+----------------+-----+----+----------+
  |S |  Year  |   Day   |  Minute   |  Millisecond   | NID | WID| Sequence |
  |  | (8b)   |  (9b)   |  (11b)    |    (16b)       |(5b) |(4b)|  (10b)   |
  +--+--------+---------+-----------+----------------+-----+----+----------+
   1     8         9          11            16           5    4      10
```

```
|S|YYYYYYYY|DDDDDDDDD|MMMMMMMMMMM|mmmmmmmmmmmmmmmm|NNNNN|WWWW|SSSSSSSSSS|
 1    8          9          11             16           5    4      10
```

| Field | Bits | Range | Notes |
|---|---|---|---|
| Sign | 1 | 0 | Always 0 — ensures BIGINT / i64 compatibility |
| Year offset | 8 | -128 to +127 | Signed offset from configured base year |
| Day of year | 9 | 0 – 365 | Day within the year (0-indexed) |
| Minute of day | 11 | 0 – 1439 | Minutes elapsed since midnight (24 × 60 = 1440) |
| Millisecond of minute | 16 | 0 – 59999 | Milliseconds elapsed within the current minute |
| Node ID | 5 | 0 – 31 | Physical machine identifier |
| Worker ID | 4 | 0 – 15 | Process/thread within node |
| Sequence | 10 | 0 – 1023 | Per-ms counter per worker |

**Total: 64 bits**
**Timestamp range: 256 years (base_year - 128 to base_year + 127)**
**Max workers: 32 nodes × 16 workers = 512**
**Max IDs/ms/worker: 1023**

---

## Field-by-Field Breakdown

### Bit 63 — Sign (1 bit)
Always `0`. Reserved to ensure the ID is always a positive value when stored as a signed 64-bit integer (`BIGINT` in databases, `i64` in Rust, `long` in Java). This preserves compatibility with systems that treat IDs as signed integers and rely on positive-only values.

---

### Bits 62–55 — Year Offset (8 bits)

Encodes a **signed** offset from a configured `base_year`.

```
actual_year = base_year + offset
offset range: -128 to +127
```

Example with `base_year = 2024`:
- Offset `-128` → year **1896**
- Offset `0`    → year **2024**
- Offset `+127` → year **2151**

This gives a **256-year window** anchored at `base_year`, spanning past and future. Unlike Snowflake's fixed epoch, the window is configurable at generator initialization — systems initialized in different decades can shift the window accordingly.

---

### Bits 54–46 — Day of Year (9 bits)

Encodes the **day of the year**, 0-indexed.

```
range: 0 – 365
9 bits capacity: 0 – 511
used: 0 – 365
reserved: 366 – 511 (146 values)
```

Leap years use day 365 (366th day, 0-indexed). Non-leap years use 0–364.

The **146 reserved values (366–511)** form a future extension buffer. See [extension-day-overflow.md](extension-day-overflow.md) for details on how these can be used to extend the year range if ever needed.

---

### Bits 45–35 — Minute of Day (11 bits)

Encodes the **minute elapsed since midnight**.

```
range: 0 – 1439  (24 hours × 60 minutes)
11 bits capacity: 0 – 2047
used: 0 – 1439
reserved: 1440 – 2047 (608 values, unused)
```

---

### Bits 34–19 — Millisecond of Minute (16 bits)

Encodes the **millisecond elapsed within the current minute**.

```
range: 0 – 59999  (60 seconds × 1000 ms)
16 bits capacity: 0 – 65535
used: 0 – 59999
reserved: 60000 – 65535 (unused)
```

Together, `minute` and `millisecond` give **full millisecond precision** within the day, equivalent to Snowflake's timestamp resolution.

---

### Bits 18–14 — Node ID (5 bits)

Identifies the **physical machine or instance** in the cluster.

```
range: 0 – 31
capacity: 32 nodes
```

---

### Bits 13–10 — Worker ID (4 bits)

Identifies the **process or thread** within a node.

```
range: 0 – 15
capacity: 16 workers per node
```

Combined cluster capacity: **32 × 16 = 512 total workers**.

> **Note:** The original Snowflake allocated 5 bits to Worker ID (32 workers/node). chronoid reduces this to 4 bits (16 workers/node) to reclaim 1 bit for the signed bit reservation — a deliberate tradeoff for BIGINT compatibility.

---

### Bits 9–0 — Sequence (10 bits)

A monotonically increasing counter, reset to 0 at each new millisecond.

```
range: 0 – 1023
capacity: 1024 IDs per millisecond per worker
```

When the sequence exhausts within a millisecond, the configured `ExhaustionStrategy` determines behavior — see [exhaustion-strategies.md](exhaustion-strategies.md).

---

## Comparison Summary

| Property | Snowflake | chronoid |
|---|---|---|
| Total bits | 64 | 64 |
| Timestamp bits | 41 | 44 |
| Timestamp encoding | Raw ms offset from epoch | Calendar decomposition |
| Timestamp range | ~69 years | ~256 years |
| Human-readable timestamp | No (requires decoding) | Yes (fields directly readable) |
| Max nodes | 32 | 32 |
| Max workers/node | 32 | 16 |
| Max total workers | 1024 | 512 |
| IDs/ms/worker | 1023 | 1023 |
| BIGINT compatible | Yes | Yes |
| Configurable base year | No | Yes |

---

## Bit Position Reference

```
Position  63   62-55   54-46   45-35   34-19   18-14   13-10   9-0
Field      S    Year    Day    Minute    Ms     Node   Worker   Seq
Bits       1     8       9      11       16       5       4      10
```