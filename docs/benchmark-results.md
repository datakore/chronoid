# Chronoid Benchmark Results

This document contains specialized performance metrics comparing the **TypeScript**, **Rust**, and **Java** implementations under identical conditions.

---

## Benchmark Configuration

- **Hardware**: Local Runner
- **Interval**: 100ms
- **Concurrency**: 10 Workers/Tasks
- **Identity**: Unique (Node, Worker) bit-prefix per worker
- **Strategy**: `WAIT_ASYNC` (non-blocking yield)
- **Max Theoretical Limit**: 2,048,000 IDs (10 workers × 2,048 IDs/ms × 100ms)

---

## 🏆 Summary Results

| Ecosystem | Total IDs (100ms) | IDs per Millisecond | Efficiency % | Note |
|---|---|---|---|---|
| **Rust** | **1,173,641** | 11,736 | **57.3%** | High-performance yielding |
| **Java 17** | **913,090** | 9,130 | **44.6%** | Optimized JVM hotpath |
| **TypeScript** | **102,337** | 1,023 | **5.0%** | Event-loop bound |

---

## 🔍 In-Depth Analysis

### 🦀 Rust Implementation
The Rust implementation achieves **57% efficiency** at the new 2,048 IDs/ms limit. By using zero-cost abstractions and direct system time calls, it manages to cross the Million-ID-per-100ms threshold easily in release mode.

### ☕ Java 17 Implementation
The Java 17 implementation achieves an impressive **44% efficiency**. Through the use of `Thread.onSpinWait()` and specialized records, the JVM's JIT compiler optimizes the generation loop to nearly match native performance after a short warm-up.

### ⚡ TypeScript Implementation
The TypeScript implementation achieves **5% efficiency**. In a single-threaded environment like Node.js, multiple "workers" are asynchronous tasks competing for the same event loop. While it provides over 1,000 IDs/ms (sufficient for most JS apps), it cannot match the multi-threaded throughput of Rust or Java.

---

## How to Reproduce

You can run these benchmarks yourself in each project folder:

**Rust:**
```bash
cargo test --release --test async_generator_test test_benchmark_10_workers_100ms -- --nocapture
```

**Java:**
```bash
mvn test -Dtest=AsyncSnowflakeGeneratorTest#testBenchmarkDetailed
```

**TypeScript:**
```bash
npx vitest run -t "should generate" tests/AsyncSnowflakeGenerator.test.ts
```
