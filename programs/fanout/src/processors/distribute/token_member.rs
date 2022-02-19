// use anchor_lang::prelude::*;
// use anchor_spl::token::{Mint, TokenAccount};
// use crate::state::{Fanout, FanoutMembershipVoucher};
//
//
//
// #[derive(Accounts)]
// pub struct DistributeTokenMember<'info> {
//     pub member: UncheckedAccount<'info>,
//     #[
//     account(
//     constraint = membership_mint_token_account.owner == *member.owner,
//     constraint = membership_mint_token_account.delegate.is_none(),
//     constraint = membership_mint_token_account.close_authority.is_none(),
//     constraint = membership_mint_token_account.mint == membership_mint.key(),
//     constraint =membership_mint_token_account.amount > 0,
//     )]
//     pub membership_mint_token_account: Account<'info, TokenAccount>,
//     pub membership_mint: Account<'info, Mint>,
//     #[account(
//     mut,
//     seeds = [b"fanout-membership", fanout.account_key.as_ref(), membership_mint.key().as_ref()],
//     bump = membership_account.bump_seed,
//     )]
//     pub membership_account: Account<'info, FanoutMembershipVoucher>,
//     #[account(
//     mut,
//     seeds = [b"fanout-config", fanout.name.as_bytes()],
//     bump = fanout.bump_seed,
//     )]
//     pub fanout: Account<'info, Fanout>,
//     #[account(
//     constraint = holding_account.key() == fanout.account_key,
//     )
//     ]
//     pub holding_account: UncheckedAccount<'info>,
//     pub system_program: Program<'info, System>,
//     pub rent: Sysvar<'info, Rent>,
// }
