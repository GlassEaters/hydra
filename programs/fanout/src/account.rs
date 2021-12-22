use anchor_lang::{
    prelude::*,
    solana_program::program::{invoke, invoke_signed},
};
use anchor_spl::{
    associated_token,
    token::{Mint, Token, TokenAccount, ID as tokenprogram_id},
};

use crate::arg::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(args: InitializeFanoutArgs)]
pub struct InitializeFanout<'info> {
    pub authority: Signer<'info>,
    #[account(
        init,
        space = 300,
        seeds = [b"fanout-config", native_account.key().as_ref()],
        bump = args.bump_seed,
        payer = authority
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
        init,
        space = 1,
        payer = authority,
        constraint = native_account.owner ==
        Pubkey::create_program_address(&[b"account-owner", fanout.key().as_ref(), &[args.account_owner_bump_seed]], &crate::id())?, // must assign ownership first
        constraint = native_account.delegate.is_none(),
        constraint = native_account.close_authority.is_none(),
        constraint = native_account.is_native() == true
        )
    ]
    pub native_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(args: AddMemberArgs)]
pub struct AddMember<'info> {
    pub authority: Signer<'info>,
    pub account: UncheckedAccount<'info>, //TODO -> Could be an NFT or a wallet, cannot be a token or ata.
    #[account(
        mut,
        seeds = [b"fanout-membership", fanout.account.key().as_ref(), account.key().as_ref()],
        bump = fanout.bump_seed,
        has_one=authority
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
        mut,
        seeds = [b"fanout-config", fanout.account.key().as_ref()],
        bump = fanout.bump_seed,
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
//
// #[account(
//   init,
//   space = 300,
//   seeds = [b"fanout-config", native_account.key().as_ref()],
//   bump = args.bump_seed,
//   payer = authority
// )]
// #[
//     account(
//       constraint = account.owner ==
//       Pubkey::create_program_address(&[b"account-owner", native_account.key().as_ref(), &[args.account_owner_bump_seed]], &crate::id())?,
//       constraint = native_account.delegate.is_none(),
//       constraint = native_account.close_authority.is_none()
//       constraint = native_account.is_native == true
//     )
//   ]
// #[derive(Accounts)]
// #[instruction(args: InitializeFanoutForMintArgs)]
// pub struct InitializeFanoutForMint<'info> {
//   #[account(mut, signer)]
//   pub authority: AccountInfo<'info>,
//   #[account(constraint= mint.owner == tokenprogram_id)]
//   pub mint: Account<'info, Mint>,
//   #[account(
//     mut,
//     seeds = [b"fanout-config", account.key().as_ref()],
//     bump = fanout.bump_seed,
//     has_one=authority
//   )]
//   pub fanout: Account<'info, Fanout>,
//   #[account(
//     init,
//     space = 300,
//     seeds = [b"fanout-config", account.key().as_ref(), mint.key().as_ref()],
//     bump = args.bump_seed,
//     payer = authority
//   )]
//   pub fanoutForMint: Account<'info, FanoutV0>,
//   #[
//     account(
//       constraint = account.owner ==
//       Pubkey::create_program_address(&[b"account-owner", account.key().as_ref(), &[args.account_owner_bump_seed]], &crate::id())?,
//       constraint = account.delegate.is_none(),
//       constraint = account.close_authority.is_none()
//       constraint = account.mint.key().as_ref() == mint.key().as_ref()
//     )
//   ]
//   pub mint_account: Account<'info, TokenAccount>,
//   pub system_program: Program<'info, System>,
//   pub rent: Sysvar<'info, Rent>,
//   pub clock: Sysvar<'info, Clock>
// }
