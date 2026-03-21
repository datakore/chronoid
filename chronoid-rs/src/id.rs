use crate::errors::{ChronoidError, Result};
use crate::types::SnowflakeComponents;
use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
pub struct SnowflakeId(u64);

impl SnowflakeId {
    pub fn from_u64(value: u64) -> Result<Self> {
        if (value >> 63) != 0 {
            return Err(ChronoidError::InvalidId("Sign bit must be 0".to_string()));
        }

        let worker = (value >> 10) & 0xF;
        let node = (value >> 14) & 0x1F;
        let millisecond = (value >> 19) & 0xFFFF;
        let minute = (value >> 35) & 0x7FF;
        let day = (value >> 46) & 0x1FF;
        let year_offset_unsigned = (value >> 55) & 0xFF;
        let year_offset = if year_offset_unsigned >= 128 {
            (year_offset_unsigned as i16) - 256
        } else {
            year_offset_unsigned as i16
        };
        let sequence = value & 0x3FF;

        // Domain validation per spec
        if sequence > 1023 {
            return Err(ChronoidError::InvalidId(format!("Sequence must be 10 bits max. Got: {sequence}")));
        }
        if year_offset < -128 || year_offset > 127 {
            return Err(ChronoidError::InvalidId(format!("Year offset out of range: {year_offset}")));
        }
        if day > 365 {
            return Err(ChronoidError::InvalidId(format!("Day field must be in range 0-365. Got: {day}")));
        }
        if minute > 1439 {
            return Err(ChronoidError::InvalidId(format!("Minute field must be in range 0-1439. Got: {minute}")));
        }
        if millisecond > 59999 {
            return Err(ChronoidError::InvalidId(format!("Millisecond field must be in range 0-59999. Got: {millisecond}")));
        }
        if node > 31 {
            return Err(ChronoidError::InvalidId(format!("Node ID must be in range 0-31. Got: {node}")));
        }
        if worker > 15 {
            return Err(ChronoidError::InvalidId(format!("Worker ID must be in range 0-15. Got: {worker}")));
        }

        Ok(SnowflakeId(value))
    }

    pub fn from_string(value: &str) -> Result<Self> {
        let val = value.parse::<u64>()
            .map_err(|e| ChronoidError::ParseError(e.to_string()))?;
        Self::from_u64(val)
    }

    pub fn node(&self) -> u32 {
        ((self.0 >> 14) & 0x1F) as u32
    }

    pub fn worker(&self) -> u32 {
        ((self.0 >> 10) & 0xF) as u32
    }

    pub fn sequence(&self) -> u32 {
        (self.0 & 0x3FF) as u32
    }

    pub fn to_u64(&self) -> u64 {
        self.0
    }

    pub fn to_hex(&self) -> String {
        format!("0x{:x}", self.0)
    }

    pub fn to_base62(&self) -> String {
        base62::encode(self.0)
    }

    pub fn ts_components(&self, base_year: i32) -> SnowflakeComponents {
        let year_offset_unsigned = (self.0 >> 55) & 0xFF;
        let signed_offset = if year_offset_unsigned >= 128 {
            (year_offset_unsigned as i32) - 256
        } else {
            year_offset_unsigned as i32
        };

        SnowflakeComponents {
            year: base_year + signed_offset,
            day: ((self.0 >> 46) & 0x1FF) as u32,
            minute: ((self.0 >> 35) & 0x7FF) as u32,
            millisecond: ((self.0 >> 19) & 0xFFFF) as u32,
        }
    }
    pub fn to_raw_u64(&self) -> u64 {
        self.0
    }
}

impl fmt::Display for SnowflakeId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_creation_validation() {
        // A valid 64-bit ID from our previous TS tests
        let valid_val = 1842995061510923267u64; 
        let id = SnowflakeId::from_u64(valid_val).unwrap();
        
        let ts = id.ts_components(1974);
        assert_eq!(ts.year, 2025);
        assert_eq!(ts.day, 78);
        assert_eq!(ts.minute, 1095);
        assert_eq!(ts.millisecond, 52613);
    }

    #[test]
    fn test_base62_encoding() {
        let valid_val = 1842995061510923267u64;
        let id = SnowflakeId::from_u64(valid_val).unwrap();
        let b62 = id.to_base62();
        assert!(!b62.is_empty());
        println!("Base62: {}", b62);
    }
}
