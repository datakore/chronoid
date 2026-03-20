import { describe, it, expect } from 'vitest';
import { SnowflakeId } from '../src/SnowflakeId.js';
import { InvalidId, ParseError } from '../src/errors.js';

describe('SnowflakeId', () => {
    // Helper to construct a valid 64-bit ID from components
    function buildId(yearOffset: bigint, day: bigint, minute: bigint, ms: bigint, node: bigint, worker: bigint, seq: bigint): bigint {
        return (yearOffset << 55n) | (day << 46n) | (minute << 35n) | (ms << 19n) | (node << 14n) | (worker << 10n) | seq;
    }

    // A valid ID: Year +24, Day 180, Minute 720, Ms 30000, Node 3, Worker 2, Sequence 1
    const validIdValue = buildId(24n, 180n, 720n, 30000n, 3n, 2n, 1n);

    describe('Creation and validation', () => {
        it('should correctly create an instance from a valid bigint', () => {
            const id = SnowflakeId.from(validIdValue);
            expect(id).toBeInstanceOf(SnowflakeId);
        });

        it('should throw InvalidId if sign bit is 1 (negative)', () => {
            expect(() => SnowflakeId.from(-1n)).toThrowError(InvalidId);
            expect(() => SnowflakeId.from(-1n)).toThrowError("Sign bit must be 0");
        });

        it('should throw InvalidId if day exceeds 365', () => {
            const invalidDay = buildId(24n, 400n, 720n, 30000n, 3n, 2n, 1n);
            expect(() => SnowflakeId.from(invalidDay)).toThrowError(InvalidId);
        });

        it('should throw InvalidId if minute exceeds 1439', () => {
            const invalidMin = buildId(24n, 180n, 1500n, 30000n, 3n, 2n, 1n);
            expect(() => SnowflakeId.from(invalidMin)).toThrowError(InvalidId);
        });

        it('should throw InvalidId if millisecond exceeds 59999', () => {
            const invalidMs = buildId(24n, 180n, 720n, 60000n, 3n, 2n, 1n);
            expect(() => SnowflakeId.from(invalidMs)).toThrowError(InvalidId);
        });
    });

    describe('String parsing', () => {
        it('should parse from valid decimal string', () => {
            const id = SnowflakeId.from_string(validIdValue.toString());
            expect(id.to_raw_i64()).toBe(validIdValue);
        });

        it('should throw ParseError on non-numeric strings', () => {
            expect(() => SnowflakeId.from_string("123abc456")).toThrowError(ParseError);
        });

        it('should surface InvalidId for structurally malformed bit layouts in strings', () => {
            const invalidDayStr = buildId(24n, 400n, 720n, 30000n, 3n, 2n, 1n).toString();
            expect(() => SnowflakeId.from_string(invalidDayStr)).toThrowError(InvalidId);
        });
    });

    describe('Field Extractors', () => {
        it('should correctly extract node, worker, and sequence', () => {
            const id = SnowflakeId.from(validIdValue);
            expect(id.node()).toBe(3);
            expect(id.worker()).toBe(2);
            expect(id.sequence()).toBe(1);
        });

        it('should correctly decode human readable ts components based on base_year', () => {
            const id = SnowflakeId.from(1842995061510923267n);
            const ts = id.ts_components(1974); // base_year = 2000
            console.log(ts);
            expect(ts.year).toBe(2025); // 2000 + 24
            expect(ts.day).toBe(78);
            expect(ts.minute).toBe(1095);
            expect(ts.millisecond).toBe(52613);
        });

        it('should correctly handle negative signed year offset', () => {
            // Unsigned 8-bit for -5 is 251 (11111011 in binary)
            const negativeYearOffset = buildId(251n, 180n, 720n, 30000n, 3n, 2n, 1n);
            const id = SnowflakeId.from(negativeYearOffset);
            const ts = id.ts_components(2000); // base_year = 2000
            expect(ts.year).toBe(1995); // 2000 - 5
        });
    });

    describe('Serialization', () => {
        it('should format hex properly', () => {
            const id = SnowflakeId.from(validIdValue);
            expect(id.to_hex()).toBe("0x" + validIdValue.toString(16).toLowerCase());
        });

        it('should properly format to_base62 generating URL-safe encoded alphanumeric mapping', () => {
            const id = SnowflakeId.from(validIdValue);
            const b62 = id.to_base62();

            expect(b62).toBeTypeOf('string');
            expect(b62.length).toBeGreaterThan(0);
            
            // Checks securely that string contains STRICTLY ONLY base62 alphabet digits (0-9, A-Z, a-z)
            expect(/^[0-9A-Za-z]+$/.test(b62)).toBe(true);

            // Special edge case: native 0 formatting
            const idZero = SnowflakeId.from(0n);
            expect(idZero.to_base62()).toBe("0");
        });

        it('should return decimal string for toJSON()', () => {
            const id = SnowflakeId.from(validIdValue);
            expect(id.toJSON()).toBe(validIdValue.toString());
            expect(JSON.stringify({ id })).toBe(`{"id":"${validIdValue.toString()}"}`);
        });
    });
});
