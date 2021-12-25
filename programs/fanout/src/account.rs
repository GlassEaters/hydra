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
        seeds = [b"fanout-config", fanout.account.key().as_ref()],
        bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
        init,
        space = 60,
        seeds = [b"fanout-membership", fanout.account.key().as_ref(), account.key().as_ref()],
        bump = fanout.bump_seed,
        payer = authority
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DistributeMember<'info> {
    pub membership_key: UncheckedAccount<'info>, //TODO -> Could be an NFT or a wallet, cannot be a token or ata.
    #[account(
        mut,
        seeds = [b"fanout-membership", fanout.account.key().as_ref(), membership_key.key().as_ref()],
        bump = fanout.bump_seed,
        has_one = membership_key
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    #[account(
        mut,
        seeds = [b"fanout-config", fanout.account.key().as_ref()],
        bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
        constraint = holding_account.key() == fanout.account.key(), 
        )
    ]
    pub holding_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
