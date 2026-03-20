# Day Overflow Extension

This document describes the day overflow extension mechanism — a reserved buffer built into chronoid's bit layout that enables year range extension without breaking changes.

---

## Background

chronoid's 9-bit day-of-year field has a capacity of **512 values** (0–511). Valid calendar days occupy only **366 of those values** (0–365, accounting for leap years). This leaves **146 values unused** (366–511).

Rather than treating these as wasted bits, chronoid **reserves them as a structured extension buffer**.

---

## The Default Range

Under normal operation, chronoid's year range is determined entirely by the 8-bit signed year offset:

```
year offset: -128 to +127
range:        256 years anchored at base_year
```

The day field operates strictly within 0–365. Values 366–511 are never written by the default generator.

---

## The Extension Mechanism

When the year offset reaches its positive ceiling (`+127`), the 146 reserved day values can be used to encode **additional years** beyond the base range.

Each reserved day value above 365 represents a carry — effectively extending the year counter:

```
day value 366 → year offset +128 (one year beyond the normal ceiling)
day value 367 → year offset +129
...
day value 511 → year offset +273
```

This gives an **additional ~146 years** on the positive side of the range, pushing the total forward range from `base_year + 127` to approximately `base_year + 273`.

---

## Why This Exists

This is a deliberate **escape hatch**, designed with the Y2K lesson in mind.

Mainframe systems in the 1970s and 1980s stored years as two digits (`yy`) — a pragmatic choice at the time, with the implicit assumption that the software would not still be running in the year 2000. It was. The cost of that assumption was significant.

chronoid takes the opposite stance:

> *"Design the extension mechanism in from day one, so the engineers who eventually need it have a known path forward — not a crisis."*

The 256-year default range is already far beyond any reasonable system lifetime. If a chronoid-based system is still running 256 years from now, the extension mechanism is already specified and documented. The engineers maintaining that system will find a clear path forward, not a cliff.

---

## When to Activate

The extension is **not active by default**. The default generator never writes day values above 365.

Activation is appropriate when:
- The year offset is approaching `+127`
- A future version of chronoid ships with explicit extension support
- A custom implementation needs to extend the range deliberately

---

## Activation Is a Breaking Change (Sort Of)

IDs generated with day values in the extension range (366–511) will **not be correctly decoded** by a standard chronoid decoder that treats any day value above 365 as invalid.

This means activation requires:
1. All decoders in the system to be updated to understand the extension encoding
2. A clear versioning or flag strategy to distinguish standard IDs from extended IDs

**Recommendation:** Treat activation as a **coordinated migration**, not a drop-in change. The 146-value buffer is large enough to buy significant time for planning such a migration.

---

## Summary

| Property | Value |
|---|---|
| Reserved day values | 366 – 511 (146 values) |
| Additional years available | ~146 |
| Default range | 256 years |
| Extended range (if activated) | ~402 years |
| Active by default | No |
| Backward compatible | No — requires coordinated decoder update |
| Designed intent | Emergency extension escape hatch |

---

## The 100-Year Buffer Argument

Even without the extension mechanism, chronoid's 256-year range provides approximately **100 years of buffer** beyond the practical lifetime of any software system built today.

The extension mechanism exists not because it will be needed — but because designing it in costs nothing and eliminates the possibility of a future crisis. Any system still running on the same ID scheme in 256 years will have engineers who can execute a planned migration. That is a very different situation from discovering an unplanned ceiling in production.