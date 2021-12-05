use anchor_lang::{prelude::*, solana_program, solana_program::{system_program, system_instruction, program::{invoke_signed, invoke}}};


#[account]
#[derive(Default)]
pub struct Fanout {
  pub account: Pubkey,
  pub total_shares: u64,
  pub total_inflow: u128,
  pub last_balance: u64,
  pub total_staked: u64,

  pub bump_seed: u8,
  pub freeze_authority_bump_seed: u8,
  pub account_owner_bump_seed: u8,
}

#[account]
#[derive(Default)]
pub struct FanoutV0 {
  pub account: Pubkey, // Split account
  pub mint: Option<Pubkey>,
  pub total_shares: u64,
  pub total_inflow: u128,
  pub last_balance: u64,
  pub total_staked: u64,

  pub bump_seed: u8,
  pub freeze_authority_bump_seed: u8,
  pub account_owner_bump_seed: u8,
}

#[account]
#[derive(Default)]
pub struct FanoutVoucherV0 {
  pub fanout: Pubkey,
  pub account: Pubkey, // Share storage account
  pub destination: Pubkey,
  pub shares: u64,
  pub inflow_at_stake: u128,
  pub last_inflow: u128,

  pub bump_seed: u8,
}

#[account]
#[derive(Default)]
pub struct VoucherCounterV0 {
  pub fanout: Pubkey,
  pub account: Pubkey, // The voucher share storage account
  pub count: u32,

  pub bump_seed: u8,
}
