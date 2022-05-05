use crate::error::HydraError;
use crate::state::{Fanout, FanoutMembershipVoucher};
use crate::utils::validation::assert_distributed;
use crate::MembershipModel;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar;
use anchor_lang::solana_program::sysvar::instructions::get_instruction_relative;

#[derive(Accounts)]
#[instruction(shares: u64)]
pub struct TransferShares<'info> {
    pub authority: Signer<'info>,
    /// CHECK: Native Account
    pub member: UncheckedAccount<'info>,
    /// CHECK: Native Account
    pub membership_key: UncheckedAccount<'info>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.name.as_bytes()],
    has_one= authority,
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    seeds = [b"fanout-membership", fanout.key().as_ref(), membership_key.key().as_ref()],
    bump,
    has_one = fanout,
    )]
    pub from_membership_account: Account<'info, FanoutMembershipVoucher>,
    #[account(
    seeds = [b"fanout-membership", fanout.key().as_ref(), membership_key.key().as_ref()],
    bump,
    has_one = fanout,
    )]
    pub to_membership_account: Account<'info, FanoutMembershipVoucher>,
    #[account(address = sysvar::instructions::id())]
    /// CHECK: Instructions SYSVAR
    pub instructions: UncheckedAccount<'info>,
}

pub fn transfer_shares(ctx: Context<TransferShares>, shares: u64) -> Result<()> {
    let fanout = &mut ctx.accounts.fanout;
    let from_membership_account = &mut ctx.accounts.from_membership_account;
    let to_membership_account = &mut ctx.accounts.to_membership_account;
    let ixs = &ctx.accounts.instructions;
    let member = &ctx.accounts.member;
    let prev_ix = get_instruction_relative(-1, ixs).unwrap();
    assert_distributed(prev_ix, member.key, fanout.membership_model)?;

    if to_membership_account.key() == from_membership_account.key() {
        return Err(HydraError::TransferNotSupported.into());
    }

    if from_membership_account.shares < shares {
        return Err(HydraError::InsufficientShares.into());
    }

    if fanout.membership_model != MembershipModel::NFT
        || fanout.membership_model != MembershipModel::Wallet
    {
        return Err(HydraError::TransferNotSupported.into());
    }
    from_membership_account.shares -= shares;
    to_membership_account.shares += shares;
    Ok(())
}
