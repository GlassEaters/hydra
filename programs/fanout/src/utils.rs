use anchor_lang::prelude::*;

use crate::error::ErrorCode;

pub trait OrArithError<T> {
    fn or_arith_error(self) -> Result<T, ProgramError>;
}

impl OrArithError<u64> for Option<u64> {
    fn or_arith_error(self) -> Result<u64, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

impl OrArithError<u32> for Option<u32> {
    fn or_arith_error(self) -> Result<u32, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

impl OrArithError<u128> for Option<u128> {
    fn or_arith_error(self) -> Result<u128, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

// pub fn calculate_dist_amount() -> Result<u64, ProgramError> {

// }

// pub fn calculate_inflow_change() -> Result<u64, ProgramError> {}
