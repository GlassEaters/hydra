use anchor_lang::{prelude::*};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeFanoutV0Args {
  pub bump_seed: u8,
  pub freeze_authority_bump_seed: u8,
  pub account_owner_bump_seed: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct StakeV0Args {
  pub bump_seed: u8,
  pub voucher_counter_bump_seed: u8,
}