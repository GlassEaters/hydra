use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::Fanout;
use crate::utils::validation::*;

#[derive(Accounts)]
pub struct StakeTokenMemberForMint<'info> {
    pub signer: Signer<'info>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.account_key.key().as_ref()],
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(
    mut,
    seeds = [b"fanout-config-mint", fanout.key().as_ref()],
    bump = fanout_for_mint.bump_seed
    )]
    pub fanout_for_mint: Account<'info, Fanout>,
    pub mint: Account<'info, Mint>,
}