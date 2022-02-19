use super::arg::AddMemberArgs;
use crate::state::Fanout;
use crate::utils::logic::calculation::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(args: AddMemberArgs)]
pub struct AddMemberWithToken<'info> {
    pub authority: Signer<'info>,
    pub membership_key: UncheckedAccount<'info>,
    #[
    account(
    constraint = membership_mint_token_account.owner ==
    *membership_key.owner,
    constraint = membership_mint_token_account.delegate.is_none(),
    constraint = membership_mint_token_account.close_authority.is_none(),
    constraint = membership_mint_token_account.mint == membership_mint.key(),
    )
    ]
    pub membership_mint_token_account: Account<'info, TokenAccount>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.account_key.key().as_ref()],
    has_one=authority,
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    mut,
    constraint = membership_mint.key() == fanout.membership_mint.unwrap().key(),
    )]
    pub membership_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}
pub fn add_member_token(ctx: Context<AddMemberWithToken>, args: AddMemberArgs) -> ProgramResult {
    let fanout = &mut ctx.accounts.fanout;
    let authority = ctx.accounts.authority.to_account_info();
    let mint = ctx.accounts.membership_mint.to_account_info();
    update_fanout_for_add(fanout, args.shares)?; //Immutable borrow and replace I just cant get my FP out of me.
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let accounts = anchor_spl::token::MintTo {
        mint: mint.to_account_info(),
        to: ctx.accounts.membership_mint_token_account.to_account_info(),
        authority,
    };
    let cpi_ctx = CpiContext::new(cpi_program, accounts);
    anchor_spl::token::mint_to(cpi_ctx, args.shares as u64)?;
    Ok(())
}
