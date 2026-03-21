import type { SnowflakeComponents } from './types.js';
import { InvalidId, ParseError } from './errors.js';

/**
 * Immutable value object wrapping a 64-bit ID.
 * Supports comparison, serialization, and field access.
 */
export class SnowflakeId {
  private constructor(private readonly value: bigint) {}

  public static from(value: bigint): SnowflakeId {
    if (value < 0n || (value >> 63n) !== 0n) {
      throw new InvalidId("Sign bit must be 0");
    }

    const worker = Number((value >> 10n) & 0xFn);
    const node = Number((value >> 14n) & 0x1Fn);
    const millisecond = Number((value >> 19n) & 0xFFFFn);
    const minute = Number((value >> 35n) & 0x7FFn);
    const day = Number((value >> 46n) & 0x1FFn);
    const yearOffsetUnsigned = Number((value >> 55n) & 0xFFn);
    const yearOffset = (yearOffsetUnsigned >= 128) ? yearOffsetUnsigned - 256 : yearOffsetUnsigned;
    const sequence = Number(value & 0x3FFn); // 10 bits natively in chronoid

    if (sequence < 0 || sequence > 1023) {
      throw new InvalidId(`Sequence must be 10 bits max (0-1023). Got: ${sequence}`);
    }

    if (yearOffset < -128 || yearOffset > 127) {
      throw new InvalidId(`Year offset must be in range -128 to 127. Got: ${yearOffset}`);
    }
    if (day > 365) {
      throw new InvalidId(`Day field must be in range 0-365. Got: ${day}`);
    }
    if (minute > 1439) {
      throw new InvalidId(`Minute field must be in range 0-1439. Got: ${minute}`);
    }
    if (millisecond > 59999) {
      throw new InvalidId(`Millisecond field must be in range 0-59999. Got: ${millisecond}`);
    }
    if (node < 0 || node > 31) {
      throw new InvalidId(`Node ID must be in range 0-31. Got: ${node}`);
    }
    if (worker < 0 || worker > 15) {
      throw new InvalidId(`Worker ID must be in range 0-15. Got: ${worker}`);
    }

    return new SnowflakeId(value);
  }

  public static from_string(value: string): SnowflakeId {
    if (!/^\d+$/.test(value)) {
      throw new ParseError("Input string is not a valid decimal integer");
    }
    try {
      return SnowflakeId.from(BigInt(value));
    } catch (e: any) {
      if (e instanceof InvalidId) {
        throw e;
      }
      throw new ParseError(e.message);
    }
  }

  public to_string(): string {
    return this.value.toString(10);
  }

  public to_hex(): string {
    return "0x" + this.value.toString(16).toLowerCase();
  }

  public to_base62(): string {
    if (this.value === 0n) return '0';
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let val = this.value;
    let result = '';
    while (val > 0n) {
      const remainder = Number(val % 62n);
      result = charset[remainder] + result;
      val = val / 62n;
    }
    return result;
  }

  public node(): number {
    return Number((this.value >> 14n) & 0x1Fn);
  }

  public worker(): number {
    return Number((this.value >> 10n) & 0xFn);
  }

  public sequence(): number {
    return Number((this.value >> 0n) & 0x3FFn);
  }

  public ts_components(base_year: number): SnowflakeComponents {
    const yearOffset = Number((this.value >> 55n) & 0xFFn);
    const signedOffset = (yearOffset >= 128) ? yearOffset - 256 : yearOffset;
    
    return {
      year: base_year + signedOffset,
      day: Number((this.value >> 46n) & 0x1FFn),
      minute: Number((this.value >> 35n) & 0x7FFn),
      millisecond: Number((this.value >> 19n) & 0xFFFFn)
    };
  }

  public to_raw_i64(): bigint {
    return this.value;
  }

  toJSON(): string {
    return this.to_string();
  }
}
