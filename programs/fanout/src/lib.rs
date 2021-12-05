use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use std::convert::TryFrom;

use crate::account::*;
use crate::arg::*;
use crate::error::ErrorCode;
use crate::state::*;

pub mod account;
pub mod arg;
pub mod error;
pub mod state;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub trait OrArithError<T> {
    fn or_arith_error(self) -> Result<T, ProgramError>;
}

impl OrArithError<u64> for Option<u64> {
    fn or_arith_error(self) -> Result<u64, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

impl OrArithError<u128> for Option<u128> {
    fn or_arith_error(self) -> Result<u128, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

fn update_inflow(fanout_account: &TokenAccount, fanout: &mut FanoutV0) -> ProgramResult {
    let current_balance = fanout_account.amount;
    let inflow_change = current_balance
        .checked_sub(fanout.last_balance)
        .or_arith_error()? as u128;
    fanout.total_inflow += inflow_change;
    if fanout.total_staked > 0 {
        // Take the share of unstaked tokens and add it back to the inflow such that the unaccounted
        // for funds get redistributed amongst the staking shareholders.
        // inflow * (total_shares - staked_shares) / staked_shares
        let unstaked_correction = inflow_change
            .checked_mul(
                (fanout.total_shares as u128)
                    .checked_sub(fanout.total_staked as u128)
                    .or_arith_error()?,
            )
            .or_arith_error()?
            .checked_div(fanout.total_staked as u128)
            .or_arith_error()?;
        fanout.total_inflow += unstaked_correction;
    }

    fanout.last_balance = current_balance;

    Ok(())
}

#[program]
pub mod fanout {
    use std::task::Context;

    use anchor_lang::solana_program::entrypoint_deprecated::ProgramResult;
    use anchor_spl::token::{self, FreezeAccount, ThawAccount, Transfer};

    use super::*;

    pub fn initialize_fanout(
        ctx: Context<>,
        args: InitializeFanoutArgs,
    ) -> ProgramResult {


        
    }

    pub fn initialize_fanout_v0(
        ctx: Context<InitializeFanoutV0>,
        args: InitializeFanoutV0Args,
    ) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;

        fanout.account = ctx.accounts.account.key();
        fanout.mint = ctx.accounts.mint.key();
        fanout.total_shares = ctx.accounts.mint.supply;
        fanout.total_inflow = 0;
        fanout.last_balance = 0;
        fanout.bump_seed = 0;
        fanout.freeze_authority_bump_seed = args.freeze_authority_bump_seed;
        fanout.account_owner_bump_seed = args.account_owner_bump_seed;

        Ok(())
    }

    pub fn stake_v0(ctx: Context<StakeV0>, args: StakeV0Args) -> ProgramResult {
        let voucher = &mut ctx.accounts.voucher;
        let fanout = &mut ctx.accounts.fanout;

        update_inflow(&ctx.accounts.fanout_account, fanout)?;
        fanout.total_staked += ctx.accounts.shares_account.amount;
        ctx.accounts.voucher_counter.count += 1;
        ctx.accounts.voucher_counter.bump_seed = args.voucher_counter_bump_seed;

        voucher.fanout = fanout.key();
        voucher.bump_seed = args.bump_seed;
        voucher.account = ctx.accounts.shares_account.key();
        voucher.shares = ctx.accounts.shares_account.amount;
        voucher.inflow_at_stake = fanout.total_inflow;
        voucher.last_inflow = fanout.total_inflow;
        voucher.destination = ctx.accounts.destination.key();

        token::freeze_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            FreezeAccount {
                account: ctx.accounts.shares_account.to_account_info().clone(),
                mint: ctx.accounts.mint.to_account_info().clone(),
                authority: ctx.accounts.freeze_authority.to_account_info().clone(),
            },
            &[&[
                b"freeze-authority",
                ctx.accounts.mint.key().as_ref(),
                &[fanout.freeze_authority_bump_seed],
            ]],
        ))?;

        Ok(())
    }

    pub fn unstake_v0(ctx: Context<UnstakeV0>) -> ProgramResult {
        ctx.accounts.fanout.total_staked -= ctx.accounts.account.amount;
        ctx.accounts.voucher_counter.count -= 1;

        if ctx.accounts.voucher_counter.count == 0 {
            token::thaw_account(CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                ThawAccount {
                    account: ctx.accounts.account.to_account_info().clone(),
                    mint: ctx.accounts.mint.to_account_info().clone(),
                    authority: ctx.accounts.freeze_authority.to_account_info().clone(),
                },
                &[&[
                    b"freeze-authority",
                    ctx.accounts.mint.key().as_ref(),
                    &[ctx.accounts.fanout.freeze_authority_bump_seed],
                ]],
            ))?;
        }

        Ok(())
    }

    pub fn distribute_v0(ctx: Context<DistributeV0>) -> ProgramResult {
        let voucher = &mut ctx.accounts.voucher;
        let fanout = &mut ctx.accounts.fanout;
        update_inflow(&ctx.accounts.fanout_account, fanout)?;

        let inflow_change = fanout
            .total_inflow
            .checked_sub(voucher.last_inflow)
            .or_arith_error()?;
        let dist_amount = (voucher.shares as u128)
            .checked_mul(inflow_change)
            .or_arith_error()?
            .checked_div(fanout.total_shares as u128)
            .or_arith_error()?;
        let dist_amount_u64 = u64::try_from(dist_amount).unwrap();

        fanout.last_balance = ctx
            .accounts
            .fanout_account
            .amount
            .checked_sub(dist_amount_u64)
            .or_arith_error()?;
        voucher.last_inflow = fanout.total_inflow;

        msg!("Transferring {} to destination", inflow_change);
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                Transfer {
                    from: ctx.accounts.fanout_account.to_account_info().clone(),
                    to: ctx.accounts.destination.to_account_info().clone(),
                    authority: ctx.accounts.owner.to_account_info().clone(),
                },
                &[&[
                    b"account-owner",
                    fanout.account.as_ref(),
                    &[fanout.account_owner_bump_seed],
                ]],
            ),
            dist_amount_u64,
        )?;

        Ok(())
    }
}
