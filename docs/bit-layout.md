# Bit Layout

This document describes the 64-bit ID layout used by chronoid, contrasted against the original Snowflake ID scheme.

---

## Original Snowflake Layout (Twitter, 2010)

```
 63                                                              0
  +--+--------------------------------------------+-----+-----+----------+
  |S |         Timestamp (41 bits)                | NID | WID | Sequence |
  |  |    milliseconds since fixed epoch          |(5b) |(5b) |  (12b)   |
  +--+--------------------------------------------+-----+-----+----------+
   1                   41                            5     5       12
```

| Field | Bits | Range | Notes |
|---|---|---|---|
| Sign | 1 | 0 | Always 0, reserved |
| Timestamp | 41 | 0 – 2^41 | ms offset from fixed epoch (~69 years) |
| Node ID | 5 | 0 – 31 | Physical machine identifier |
| Worker ID | 5 | 0 – 31 | Process/thread within node |
| Sequence | 12 | 0 – 4095 | Per-ms counter per worker |

**Total: 64 bits**
**Timestamp range: ~69.7 years from epoch**
**Max workers: 32 nodes × 32 workers = 1,024**
**Max IDs/ms/worker: 4,095**

---

## chronoid Layout (v2)

```
 63                                                                       0
  +--+--------+---------+-----------+----------------+-----+----+----------+
  |S |  Year  |   Day   |  Minute   |  Millisecond   | NID | WID| Sequence |
  |  | (8b)   |  (9b)   |  (11b)    |    (16b)       |(4b) |(4b)|  (11b)   |
  +--+--------+---------+-----------+----------------+-----+----+----------+
   1     8         9          11            16           4    4      11
```

```
|S|YYYYYYYY|DDDDDDDDD|MMMMMMMMMMM|mmmmmmmmmmmmmmmm|NNNN|WWWW|SSSSSSSSSSS|
 1    8          9          11             16           4    4      11
```

| Field | Bits | Range | Notes |
|---|---|---|---|
| Sign | 1 | 0 | Always 0 — ensures BIGINT / i64 compatibility |
| Year offset | 8 | -128 to +127 | Signed offset from configured base year |
| Day of year | 9 | 0 – 365 | Day within the year (0-indexed) |
| Minute of day | 11 | 0 – 1,439 | Minutes elapsed since midnight |
| Millisecond of minute | 16 | 0 – 59,999 | Milliseconds within the minute |
| Node ID | 4 | 0 – 15 | Physical node/cluster identifier |
| Worker ID | 4 | 0 – 15 | Process/thread replica within node |
| Sequence | 11 | 0 – 2,047 | Per-ms counter per worker (burst capacity) |

**Total: 64 bits**
**Timestamp range: 256 years (Centurial durability)**
**Max workers: 16 nodes × 16 workers = 256**
**Max IDs/ms/worker: 2,047**

---

## Field-by-Field Breakdown

### Bit 63 — Sign (1 bit)
Always `0`. Reserved to ensure the ID is always a positive value when stored as a signed 64-bit integer (`BIGINT` in databases, `i64` in Rust, `long` in Java).

### Bits 62–55 — Year Offset (8 bits)
Encodes a signed offset from a `base_year`. For example, `base_year = 2024` allows a window from **1896 to 2151**.

### Bits 54–46 — Day of Year (9 bits)
Day within the year (0-indexed, up to 365).

### Bits 45–35 — Minute of Day (11 bits)
Minute elapsed since midnight (0–1,439).

### Bits 34–19 — Millisecond of Minute (16 bits)
Millisecond within the minute (0–59,999).

### Bits 18–15 — Node ID (4 bits)
Identifies the physical node or datacenter cluster.

### Bits 14–11 — Worker ID (4 bits)
Identifies the process replica or thread within the node.

### Bits 10–0 — Sequence (11 bits)
A monotonically increasing counter, reset each millisecond. Capacity: **2,048 IDs/ms**.

---

## Comparison Summary

| Property | Snowflake | chronoid |
|---|---|---|
| Total bits | 64 | 64 |
| Timestamp bits | 41 | 44 |
| Timestamp range | ~69.7 years | **256 years** |
| Human-readable | No | **Yes** (fields directly readable) |
| Max Nodes | 32 | 16 |
| Max Workers/Node | 32 | 16 |
| IDs/ms/worker | 4,095 | 2,047 |
| BIGINT compatible | Yes | Yes |

---

## Bit Position Reference

```
Position  63   62-55   54-46   45-35   34-19   18-15   14-11   10-0
Field      S    Year    Day    Minute    Ms     Node   Worker   Seq
Bits       1     8       9      11       16       4       4      11
```