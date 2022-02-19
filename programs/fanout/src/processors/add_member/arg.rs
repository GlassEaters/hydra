use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AddMemberArgs {
    pub voucher_bump_seed: u8,
    pub shares: u64,
}
