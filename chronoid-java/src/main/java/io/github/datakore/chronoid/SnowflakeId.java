package io.github.datakore.chronoid;

import com.fasterxml.jackson.annotation.JsonValue;
import java.math.BigInteger;

public record SnowflakeId(long value) {
    public SnowflakeId {
        if (value < 0) {
            throw new ChronoidException.InvalidId("Sign bit must be 0 (value cannot be negative)");
        }
        validate(value);
    }

    public static SnowflakeId from(long value) {
        return new SnowflakeId(value);
    }

    public static SnowflakeId fromString(String value) {
        try {
            return new SnowflakeId(Long.parseUnsignedLong(value));
        } catch (NumberFormatException e) {
            throw new ChronoidException.ParseError(e.getMessage());
        }
    }

    private static void validate(long value) {
        int sequence = (int) (value & 0x3FFL);
        int worker = (int) ((value >> 10) & 0xFL);
        int node = (int) ((value >> 14) & 0x1FL);
        int millisecond = (int) ((value >> 19) & 0xFFFFL);
        int minute = (int) ((value >> 35) & 0x7FFL);
        int day = (int) ((value >> 46) & 0x1FFL);
        
        if (sequence > 1023) throw new ChronoidException.InvalidId("Sequence too large");
        if (worker > 15) throw new ChronoidException.InvalidId("Worker too large");
        if (node > 31) throw new ChronoidException.InvalidId("Node too large");
        if (millisecond > 59999) throw new ChronoidException.InvalidId("Millisecond too large");
        if (minute > 1439) throw new ChronoidException.InvalidId("Minute too large");
        if (day > 365) throw new ChronoidException.InvalidId("Day too large");
    }

    public int node() { return (int) ((value >> 14) & 0x1FL); }
    public int worker() { return (int) ((value >> 10) & 0xFL); }
    public int sequence() { return (int) (value & 0x3FFL); }

    public String toHex() {
        return "0x" + Long.toHexString(value).toLowerCase();
    }

    @JsonValue
    @Override
    public String toString() {
        return Long.toUnsignedString(value);
    }

    public String toBase62() {
        if (value == 0) return "0";
        char[] charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
        StringBuilder sb = new StringBuilder();
        long v = value;
        while (v > 0) {
            sb.append(charset[(int) (v % 62)]);
            v /= 62;
        }
        return sb.reverse().toString();
    }

    public SnowflakeComponents getComponents(int baseYear) {
        int yearOffsetUnsigned = (int) ((value >> 55) & 0xFFL);
        int signedOffset = (yearOffsetUnsigned >= 128) ? yearOffsetUnsigned - 256 : yearOffsetUnsigned;

        return new SnowflakeComponents(
            baseYear + signedOffset,
            (int) ((value >> 46) & 0x1FFL),
            (int) ((value >> 35) & 0x7FFL),
            (int) ((value >> 19) & 0xFFFFL)
        );
    }
}
