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

    #[msg("Invalid Membership Model")]
    InvalidMembershipModel,

    #[msg("Invalid Membership Voucher")]
    InvalidMembershipVoucher,

    #[msg("Invalid Mint for the config")]
    MintDoesNotMatch,

    #[msg("Holding account does not match the config")]
    InvalidHoldingAccount,

    #[msg("A Mint holding account must be an ata for the mint owned by the config")]
    HoldingAccountMustBeAnATA,

    DerivedKeyInvalid,

    IncorrectOwner,

    #[msg("Wallet Does not Own Membership Token")]
    WalletDoesNotOwnMembershipToken,
}
