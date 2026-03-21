# chronoid-ts (v2)

TypeScript implementation of the Chronoid distributed 64-bit ID generator.

## Features (v2)
- **High Burst Capacity**: **2,048 IDs/ms** per process.
- **Node/Worker Layout**: Support for 256 concurrent processes (16 Nodes × 16 Workers).
- **Human Inspectable**: Calendar-decomposed timestamps (Year, Day, Minute, Ms).
- **Zero Dependencies**: Lightweight and fast.
- **Cross-Platform**: Matches Rust and Java bit layouts exactly.

## Installation
```bash
npm install @datakore/chronoid
```

## Usage
```typescript
import { SnowflakeGenerator, AsyncExhaustionStrategy } from '@datakore/chronoid';

const generator = SnowflakeGenerator.create(
    2024,                      // base year
    1,                         // node ID (0-15)
    1,                         // worker ID (0-15)
    AsyncExhaustionStrategy.WaitAsync
);

const id = await generator.generate();
console.log("ID:", id.to_string());
console.log("TS Components:", id.ts_components(2024));
```

## Performance
Achieves **102k IDs per 100ms** in Node.js environments.

## License
MIT