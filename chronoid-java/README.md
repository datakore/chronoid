# chronoid-java (v2)

High-performance Java 17 implementation of the distributed Chronoid ID generator.

## Key Changes in v2
- **Higher Burst Capacity**: Increased sequence bits from 10 to 11 (2,048 IDs/ms per worker).
- **Consolidated Node/Worker ID**: Node (4 bits) and Worker (4 bits) providing support for 256 concurrent processes.
- **Improved Sorting**: Implemented `Comparable` and `Serializable` for native Java use.

---

## Installation (Maven)
```xml
<dependency>
    <groupId>io.github.datakore</groupId>
    <artifactId>chronoid</artifactId>
    <version>0.1.4</version>
</dependency>
```

## Usage
```java
import io.github.datakore.chronoid.*;

AsyncSnowflakeGenerator generator = SnowflakeGenerator.create(
    2024,                      // Base Year
    1,                         // Node ID (0-15)
    1,                         // Worker ID (0-15)
    AsyncExhaustionStrategy.WAIT_ASYNC
);

SnowflakeId id = generator.generate().join();
System.out.println("ID: " + id.toString());
System.out.println("Hex: " + id.toHex());
```

## Features
- **256-year range** anchored at a configurable base year.
- **Human-readable timestamps** directly encoded into the ID components.
- **Lexicographical sortability** (Timestamp > Sequence > Node/Worker).

## Performance
Achieves **913k IDs per 100ms** on local benchmarks.

---

## License
MIT
