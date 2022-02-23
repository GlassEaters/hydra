use super::arg::AddMemberArgs;
use crate::state::{Fanout, FanoutMembershipVoucher, FANOUT_MEMBERSHIP_VOUCHER_SIZE};
use crate::utils::logic::calculation::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use crate::utils::validation::assert_owned_by;

#[derive(Accounts)]
#[instruction(args: AddMemberArgs)]
pub struct AddMemberWallet<'info> {
    pub authority: Signer<'info>,
    pub member: UncheckedAccount<'info>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.account_key.as_ref()],
    has_one = authority,
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    init,
    space = FANOUT_MEMBERSHIP_VOUCHER_SIZE,
    seeds = [b"fanout-membership", fanout.key().as_ref(), member.key().as_ref()],
    bump = args.voucher_bump_seed,
    payer = authority
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

pub fn add_member_wallet(ctx: Context<AddMemberWallet>, args: AddMemberArgs) -> ProgramResult {
    let fanout = &mut ctx.accounts.fanout;
    let member = &ctx.accounts.member;
    let membership_account = &mut ctx.accounts.membership_account;
    update_fanout_for_add(fanout, args.shares)?;
    assert_owned_by(&fanout.to_account_info(), &crate::ID)?;
    assert_owned_by(&member.to_account_info(), &System::id())?;
    membership_account.membership_key = Some(member.key());
    membership_account.shares = Some(args.shares);
    membership_account.bump_seed = args.voucher_bump_seed;
    Ok(())
}
