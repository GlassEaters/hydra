use super::arg::AddMemberArgs;
use crate::state::{Fanout, FanoutMembershipVoucher};
use crate::utils::logic::calculation::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;

#[derive(Accounts)]
#[instruction(args: AddMemberArgs)]
pub struct AddMemberWallet<'info> {
    pub authority: Signer<'info>,
    pub member: UncheckedAccount<'info>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.account_key.as_ref()],
    has_one=authority,
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    init,
    space = 78,
    seeds = [b"fanout-membership", fanout.account_key.as_ref(), member.key().as_ref()],
    bump = fanout.bump_seed,
    payer = authority
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

pub fn add_member_wallet(ctx: Context<AddMemberWallet>, args: AddMemberArgs) -> ProgramResult {
    let fanout = &mut ctx.accounts.fanout;
    let membership_account = &mut ctx.accounts.membership_account;
    update_fanout_for_add(fanout, args.shares)?;
    membership_account.membership_key = Some(ctx.accounts.member.key());
    membership_account.shares = Some(args.shares);
    Ok(())
}
