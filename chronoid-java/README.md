# chronoid-java

A high-performance Java 17 implementation of the distributed Chronoid (Snowflake variant) ID generator with human-readable calendar timestamps.

---

## Installation

Add the following to your `pom.xml`:

```xml
<dependency>
    <groupId>io.github.datakore</groupId>
    <artifactId>chronoid</artifactId>
    <version>0.1.2</version>
</dependency>
```

---

## Usage

### Asynchronous Generation (Non-blocking)

```java
import io.github.datakore.chronoid.*;

AsyncSnowflakeGenerator generator = SnowflakeGenerator.create(
    2024,                       // base year
    1,                          // node ID
    1,                          // worker ID
    AsyncExhaustionStrategy.WAIT_ASYNC
);

generator.generate().thenAccept(id -> {
    System.out.println("Generated ID: " + id.toString());
    System.out.println("ID in Hex: " + id.toHex());
});
```

### Synchronous Generation (Blocking)

```java
import io.github.datakore.chronoid.*;

SyncSnowflakeGenerator generator = SnowflakeGenerator.createSync(
    2024, 
    1, 
    1, 
    SyncExhaustionStrategy.BLOCK
);

SnowflakeId id = generator.generate();
System.out.println(id.toBase62());
```

---

## Data Models

This library utilizes Java 17 **Records** for immutability and memory efficiency.

```java
SnowflakeId id = ...;
SnowflakeComponents comps = id.getComponents(2024);

System.out.println(comps.year());
System.out.println(comps.day());
System.out.println(comps.minute());
System.out.println(comps.millisecond());
```

---

## License

MIT
