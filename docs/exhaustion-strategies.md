# Exhaustion Strategies

This document explains what sequence exhaustion is, when it occurs, and how chronoid's three strategies handle it.

---

## What is Sequence Exhaustion?

Each chronoid ID encodes a 10-bit sequence counter, allowing **1024 unique IDs per millisecond per worker** (values 0–1023).

Under normal load, the sequence counter increments with each generated ID and resets to `0` at the start of each new millisecond. This is sufficient for the vast majority of workloads.

**Sequence exhaustion** occurs when all 1024 sequence values are consumed within a single millisecond — i.e., a worker attempts to generate its 1025th ID within the same millisecond. At this point, the generator must decide what to do.

---

## The Three Strategies

chronoid offers three strategies, split across the two generator interfaces to ensure **invalid states are unrepresentable** at the type level.

```
AsyncExhaustionStrategy    SyncExhaustionStrategy
├── Throw                  ├── Throw
└── WaitAsync              └── Block
```

---

### `Throw`

**Available on:** `AsyncSnowflakeGenerator`, `SyncSnowflakeGenerator`

**Behavior:** Return a `SequenceExhausted` error immediately. The caller is responsible for handling it — retry logic, backpressure, or circuit breaking.

**Use when:**
- You have external retry logic already in place
- Latency is more critical than throughput — you'd rather fail fast than wait
- You want explicit control over what happens under extreme load
- You are building a system where ID generation failures are observable and actionable

**Example scenario:** A high-frequency trading system where a delayed ID is worse than a failed one.

---

### `WaitAsync`

**Available on:** `AsyncSnowflakeGenerator` only

**Behavior:** Asynchronously yield/sleep until the clock advances to the next millisecond, then reset the sequence and generate the ID. The caller awaits the result without blocking a thread.

**Use when:**
- You are in an async runtime (Tokio, Node.js event loop, etc.)
- Occasional sub-millisecond waits are acceptable
- You want transparent handling — callers just `await generate()` and get an ID
- Thread efficiency matters — you do not want to burn a thread on a blocking wait

**Example scenario:** A web API handler generating IDs for incoming requests in an async framework.

**Important:** `WaitAsync` is only valid with `AsyncSnowflakeGenerator`. Passing `WaitAsync` to `create_sync()` is a construction-time error.

---

### `Block`

**Available on:** `SyncSnowflakeGenerator` only

**Behavior:** Synchronously sleep/spin until the clock advances to the next millisecond, then reset the sequence and generate the ID. The calling thread is blocked for the duration.

**Use when:**
- You are in a synchronous context without an async runtime
- The simplicity of a blocking call is preferable to async complexity
- The workload is such that exhaustion is rare — blocking for sub-millisecond durations is acceptable
- You are writing scripts, CLI tools, or batch processors

**Example scenario:** A batch job assigning IDs to records being written to a database sequentially.

**Important:** `Block` is only valid with `SyncSnowflakeGenerator`. Passing `Block` to `create()` is a construction-time error.

---

## Strategy Selection Guide

```
Are you in an async context?
├── Yes → Use AsyncSnowflakeGenerator
│         ├── Fail fast on exhaustion?  → Throw
│         └── Transparent wait?         → WaitAsync
└── No  → Use SyncSnowflakeGenerator
          ├── Fail fast on exhaustion?  → Throw
          └── Block until next ms?      → Block
```

---

## How Long Does a Wait Last?

In both `WaitAsync` and `Block`, the wait duration is **at most 1 millisecond** — the time until the clock ticks to the next millisecond boundary. In practice, this is typically a fraction of a millisecond since the exhaustion occurs mid-millisecond.

Under sustained extreme load (continuously hitting 1024 IDs/ms/worker), the generator will chain waits — each millisecond producing exactly 1024 IDs before advancing. This is predictable and bounded behavior.

---

## Type Safety Across Languages

The strategy split into two enums ensures that the wrong strategy cannot be passed to the wrong generator:

| Language | Enforcement |
|---|---|
| Rust | Separate enum types, compiler rejects mismatched arguments |
| TypeScript | Separate enum types, TypeScript compiler rejects at compile time |
| Java | Separate enum types, compiler rejects mismatched method arguments |

There is no runtime check needed — the type system makes the invalid combination impossible to express.