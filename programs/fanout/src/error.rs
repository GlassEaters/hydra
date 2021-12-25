use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Encountered an arithmetic error")]
    BadArtithmetic,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Not Enough Available Shares")]
    InsufficientShares,

    #[msg("All available shares must be assigned to a member")]
    SharesArentAtMax,
}
