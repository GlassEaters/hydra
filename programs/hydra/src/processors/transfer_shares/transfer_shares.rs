use crate::error::ErrorCode;
use crate::state::{Fanout, FanoutMembershipVoucher};

use crate::MembershipModel;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(shares: u64)]
pub struct TransferShares<'info> {
    pub authority: Signer<'info>,
    pub member: UncheckedAccount<'info>,
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
}

pub fn transfer_shares(ctx: Context<TransferShares>, shares: u64) -> ProgramResult {
    let fanout = &mut ctx.accounts.fanout;
    let from_membership_account = &mut ctx.accounts.from_membership_account;
    let to_membership_account = &mut ctx.accounts.to_membership_account;

    if to_membership_account.key() == from_membership_account.key() {
        return Err(ErrorCode::TransferNotSupported.into());
    }

    if from_membership_account.shares < shares {
        return Err(ErrorCode::InsufficientShares.into());
    }

    if fanout.membership_model != MembershipModel::NFT
        || fanout.membership_model != MembershipModel::Wallet
    {
        return Err(ErrorCode::TransferNotSupported.into());
    }
    from_membership_account.shares -= shares;
    to_membership_account.shares += shares;
    Ok(())
}
