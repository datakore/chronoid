# Chronoid Benchmark Results

This document contains specialized performance metrics comparing the **TypeScript**, **Rust**, and **Java** implementations under identical conditions.

---

## Benchmark Configuration

- **Hardware**: Local Runner
- **Interval**: 100ms (to stabilize JIT and Cold-Start overhead)
- **Concurrency**: 10 Workers/Tasks (parallelized where applicable)
- **Identity**: Unique (Node, Worker) bit-prefix per worker
- **Strategy**: `WAIT_ASYNC` (non-blocking yield)

---

## 🏆 Summary Results

| Ecosystem | Total IDs (100ms) | IDs per Millisecond | Efficiency % | Note |
|---|---|---|---|---|
| **Rust** | **940,886** | 9,408 | **92%** | Near hardware limits |
| **Java 17** | **400,890** | 4,008 | **39%** | Solid JIT results |
| **TypeScript** | **71,751** | 717 | **7%** | Single-threaded |

---

## 🔍 In-Depth Analysis

### 🦀 Rust Implementation
The Rust implementation is the definitive leader, achieving **92% theoretical efficiency**. Since each millisecond only allows for 1,024 IDs per worker, the theoretical limit for 10 workers over 100ms is exactly **1,024,000 IDs**. Rust's proximity to this limit demonstrates zero-cost abstractions and zero GC overhead.

### ☕ Java 17 Implementation
The Java 17 implementation achieves a high-performance **39% efficiency**. By using specialized `record` classes and `Thread.onSpinWait()`, the JVM effectively bypasses OS-level timer bottlenecks. The remaining gap with Rust is largely attributed to JVM synchronization overhead and object management within the benchmark loop.

### ⚡ TypeScript Implementation
The TypeScript implementation achieves **7% efficiency**. Because Node.js is single-threaded, the "10 workers" are actually 10 asynchronous tasks competing for the single V8 event loop. The overhead of the `Promise` resolution cycle and the event loop's microtask queue is the primary bottleneck compared to multi-threaded runtimes.

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
