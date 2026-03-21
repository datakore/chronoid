package io.github.datakore.chronoid;

public record SnowflakeComponents(
    int year,
    int day,
    int minute,
    int millisecond
) {}
