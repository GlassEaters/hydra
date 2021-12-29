use crate::state::*;
use anchor_lang::prelude::*;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeFanoutArgs {
    pub bump_seed: u8,
    pub native_account_bump_seed: u8,
    pub account_owner_bump_seed: u8,
    pub name: String,
    pub total_shares: u64,
    pub membership_model: MembershipModel,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]

pub struct AddMemberArgs {
    pub voucher_bump_seed: u8,
    pub shares: u64,
}
