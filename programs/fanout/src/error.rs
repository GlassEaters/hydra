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

    #[msg("A New mint account must be provided")]
    NewMintAccountRequired,

    #[msg("A Token type Fanout requires a Membership Mint")]
    MintAccountRequired,
}
