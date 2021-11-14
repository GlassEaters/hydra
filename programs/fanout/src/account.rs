use anchor_lang::{prelude::*, solana_program, solana_program::{system_program, system_instruction, program::{invoke_signed, invoke}}};
use anchor_spl::{token, token::{Mint, Token, TokenAccount}};

use crate::state::*;
use crate::arg::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(args: InitializeFanoutV0Args)]
pub struct InitializeFanoutV0<'info> {
  #[account(mut, signer)]
  pub payer: AccountInfo<'info>,
  #[account(
    init,
    space = 300,
    seeds = [b"fanout", account.key().as_ref()],
    bump = args.bump_seed,
    payer = payer
  )]
  pub fanout: Account<'info, FanoutV0>,
  #[
    account(
      constraint = mint.mint_authority.is_none(),
      constraint = mint.freeze_authority.ok_or::<ProgramError>(ErrorCode::InvalidAuthority.into())? == 
        Pubkey::create_program_address(&[b"freeze-authority", mint.key().as_ref(), &[args.freeze_authority_bump_seed]], &crate::id())?
    )
  ]
  pub mint: Account<'info, Mint>,
  #[
    account(
      constraint = account.owner == 
      Pubkey::create_program_address(&[b"account-owner", account.key().as_ref(), &[args.account_owner_bump_seed]], &crate::id())?,
      constraint = account.delegate.is_none(),
      constraint = account.close_authority.is_none()
    )
  ]
  pub account: Account<'info, TokenAccount>,
  pub system_program: Program<'info, System>,
  pub rent: Sysvar<'info, Rent>,
}


/**
 * This is explicitly permissionless, save for the payer, so that the distributor can start
 * staking on distributed accounts immediately. Unstake the owner must sign
 */
#[derive(Accounts)]
#[instruction(bump_seed: u8)]
pub struct StakeV0<'info> {
  #[account(mut, signer)]
  pub payer: AccountInfo<'info>,
  #[account(
    mut,
    has_one = mint,
    constraint = fanout.account == fanout_account.key()
  )]
  pub fanout: Box<Account<'info, FanoutV0>>,
  #[account(
    init,
    space = 300,
    seeds = [b"voucher", voucher_account.key().as_ref()],
    bump = bump_seed,
    payer = payer
  )]
  pub voucher: Box<Account<'info, FanoutVoucherV0>>,
  #[account(
    mut,
    has_one = mint,
    has_one = owner
  )]
  pub voucher_account: Box<Account<'info, TokenAccount>>,
  pub owner: Signer<'info>,
  #[account(
    constraint = destination.mint == fanout_account.mint
  )]
  pub destination: Box<Account<'info, TokenAccount>>,
  pub fanout_account: Box<Account<'info, TokenAccount>>,
  pub mint: Box<Account<'info, Mint>>,
  #[account(
    constraint = mint.freeze_authority.ok_or::<ProgramError>(ErrorCode::InvalidAuthority.into())? == freeze_authority.key()
  )]
  pub freeze_authority: AccountInfo<'info>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
  pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UnstakeV0<'info> {
  #[account(mut)]
  pub refund: AccountInfo<'info>,
  pub fanout: Account<'info, FanoutV0>,
  #[account(
    mut,
    has_one = fanout,
    close = refund,
    has_one = account
  )]
  pub voucher: Account<'info, FanoutVoucherV0>,
  #[account(
    has_one = owner
  )]
  pub account: Account<'info, TokenAccount>,
  pub owner: Signer<'info>,
  pub mint: Account<'info, Mint>,
  #[account(
    constraint = mint.freeze_authority.ok_or::<ProgramError>(ErrorCode::InvalidAuthority.into())? == freeze_authority.key()
  )]
  pub freeze_authority: AccountInfo<'info>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
  pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DistributeV0<'info> {
  #[account(
    mut,
    constraint = fanout.account == fanout_account.key()
  )]
  pub fanout: Account<'info, FanoutV0>,
  #[account(
    mut,
    has_one = fanout,
    has_one = destination,
  )]
  pub voucher: Account<'info, FanoutVoucherV0>,
  #[account(
    mut,
    has_one = owner
  )]
  pub fanout_account: Account<'info, TokenAccount>,
  pub owner: AccountInfo<'info>,
  #[account(mut)]
  pub destination: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
}
