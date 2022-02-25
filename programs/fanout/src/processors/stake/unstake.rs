use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::error::{ErrorCode, OrArithError};
use crate::state::{Fanout, FanoutMembershipVoucher, FANOUT_MEMBERSHIP_VOUCHER_SIZE};
use crate::utils::logic::calculation::update_fanout_for_add;
use crate::utils::validation::*;
use anchor_lang::solana_program::sysvar;
use anchor_lang::solana_program::sysvar::instructions::get_instruction_relative;

#[derive(Accounts)]
#[instruction(shares: u64)]
pub struct UnStakeTokenMember<'info> {
    #[account(mut)]
    pub member: Signer<'info>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.name.as_bytes()],
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    mut,
    close = member,
    seeds = [b"fanout-membership", fanout.key().as_ref(), member.key().as_ref()],
    bump,
    constraint=membership_account.membership_key == member.key()
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    #[account(
    mut,
    constraint = fanout.membership_mint.is_some() && membership_mint.key() == fanout.membership_mint.unwrap(),
    )]
    pub membership_mint: Account<'info, Mint>,
    #[account(
    mut,
    constraint = membership_mint_token_account.mint == membership_mint.key(),
    constraint = membership_mint_token_account.delegate.is_none(),
    constraint = membership_mint_token_account.close_authority.is_none(),
    constraint = membership_mint_token_account.amount >= shares,
    )]
    pub membership_mint_token_account: Account<'info, TokenAccount>,
    #[account(
    mut,
    close = member,
    seeds = [b"fanout-stake", fanout.key().as_ref(), member.key().as_ref()],
    bump,
    constraint = member_stake_account.owner == membership_account.key(),
    constraint = member_stake_account.mint == membership_mint.key()
    )]
    pub member_stake_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    #[account(address = sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>
}

pub  fn unstake(
    ctx: Context<UnStakeTokenMember>,
    shares: u64,
) -> ProgramResult {
    let fanout = &mut ctx.accounts.fanout;
    let member = &ctx.accounts.member;
    let ixs = &ctx.accounts.instructions;
    let membership_mint = &mut ctx.accounts.membership_mint;
    let prev_ix = get_instruction_relative(-1, ixs).unwrap();
    assert_distributed(
        prev_ix,
        member.key,
        fanout.membership_model
    )?;
    assert_owned_by(&fanout.to_account_info(), &crate::ID)?;
    assert_owned_by(&member.to_account_info(), &System::id())?;
    let stake_account_info = ctx.accounts.member_stake_account.to_account_info();
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let accounts = anchor_spl::token::Transfer {
        from: stake_account_info.clone(),
        to: ctx.accounts.membership_mint_token_account.to_account_info(),
        authority: stake_account_info,
    };
    fanout.total_shares = membership_mint.supply;
    fanout.total_members = fanout.total_members.checked_add(1).or_arith_error()?;
    let cpi_ctx = CpiContext::new(cpi_program, accounts);
    anchor_spl::token::transfer(cpi_ctx.with_signer(&[&[
        "fanout-stake".as_bytes(),
        fanout.key().as_ref(),
        member.key().as_ref(),
        &[*ctx.bumps.get("member_stake_account").unwrap()]]
    ]), shares)?;
    Ok(())
}
