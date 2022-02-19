use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::{Fanout, FanoutMembershipVoucher};
use crate::utils::validation::*;

#[derive(Accounts)]
pub struct StakeTokenMember<'info> {
    pub signer: Signer<'info>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.name.as_bytes()],
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    init,
    space = 78,
    seeds = [b"fanout-membership", fanout.account_key.key().as_ref(), signer.key().as_ref()],
    bump = fanout.bump_seed,
    payer = signer
    )]
    pub membership_account: Account<'info, FanoutMembershipVoucher>,
    #[account(
    mut,
    constraint = fanout.membership_mint.is_some() && membership_mint.key() == fanout.membership_mint.unwrap().key(),
    )]
    pub membership_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

