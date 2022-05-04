use crate::error::{OrArithError};
use crate::state::{Fanout};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct TransferToArgs {
    pub bump_seed: u8,
    pub native_account_bump_seed: u8,
}

#[derive(Accounts)]
#[instruction(args: TransferToArgs)]
pub struct TransferToHodling<'info> {
    #[account(
        mut,
        seeds = [b"fanout-config", fanout.name.as_bytes()],
        bump = fanout.bump_seed,
    )]
    pub fanout: Box<Account<'info, Fanout>>,
    #[account(mut)]
    /// CHECK: Could be native or Token Account
    pub holding_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
pub fn transfer_to_hodling(
    ctx: Context<TransferToHodling>,
    _args: TransferToArgs
) -> Result<()> {
    let fanout = &mut ctx.accounts.fanout.to_account_info();
    let hodling = ctx.accounts.holding_account.to_account_info();
    let snapshot: u64 = fanout.lamports();

    **fanout.lamports.borrow_mut() = 0;

    **hodling.lamports.borrow_mut() = hodling
        .lamports()
        .checked_add(snapshot)
        .or_arith_error()?;

    Ok(())
}
