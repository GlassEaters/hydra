use crate::account::*;
use crate::arg::*;
use crate::error::*;
use crate::utils::*;
use anchor_lang::declare_id;
use anchor_lang::prelude::*;
pub mod account;
pub mod arg;
pub mod error;
pub mod state;
pub mod utils;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod fanout {
    use state::Fanout;



    use super::*;

    pub fn init(ctx: Context<InitializeFanout>, args: InitializeFanoutArgs) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        fanout.authority = ctx.accounts.authority.to_account_info().key();
        fanout.account = ctx.accounts.native_account.to_account_info().key();
        fanout.name = args.name;
        fanout.total_shares = args.total_shares;
        fanout.total_available_shares = args.total_shares;
        let account = &ctx.accounts.native_account;
        fanout.total_inflow = account.to_account_info().lamports();
        fanout.last_snapshot_amount = 0;
        fanout.bump_seed = args.bump_seed;
        fanout.account_owner_bump_seed = args.account_owner_bump_seed;
        fanout.membership_model = args.membership_model;
        Ok(())
    }

    pub fn add(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let membership_account = &mut ctx.accounts.membership_account;
        fanout.total_members = fanout.total_members.checked_add(1).or_arith_error()?;

        //TODO safe math
        let less_shares = fanout
            .total_available_shares
            .checked_sub(args.shares)
            .or_arith_error()?;
        fanout.total_members = fanout.total_members.checked_add(1).or_arith_error()?;
        fanout.total_available_shares = less_shares;

        if less_shares > 0 {
            membership_account.shares = args.shares;
            membership_account.total_inflow = 0;
            membership_account.bump_seed = args.voucher_bump_seed;
            membership_account.membership_key = ctx.accounts.account.key();
        } else {
            return Err(ErrorCode::InsufficientShares.into());
        }
        Ok(())
    }

    // pub fn transfer_shares(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn remove_member(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}

    pub fn distribute_member(ctx: Context<DistributeMember>) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let membership_account = &mut ctx.accounts.membership_account;
        let member = &mut ctx.accounts.membership_key;
        let last_snapshot_amount = &mut fanout.last_snapshot_amount;
        let current_snapshot = ctx.accounts.holding_account.lamports;
        if fanout.total_available_shares != 0 {
            //does not allow for disrtubution before all members are added
            return Err(ErrorCode::.into());
        }
        //todo spl tokens
        let diff: u64 = current_snapshot
            .checked_sub(last_snapshot_amount)
            .or_arith_error()?;
        fanout.total_inflow += diff;
        fanout.last_snapshot_amount = current_snapshot;
        if diff < fanout.total_shares {
            //TODO - cant distribute less than total shares
            return Err(ErrorCode::InsufficientShares.into());
        }
        let dif_dist = (membership_account.shares as u64)
            .checked_mul(diff)
            .checked_div(fanout.total_shares)
            .or_arith_error()?;

        membership_account.total_inflow += dif_dist;
        **ctx.accounts.holding_account.lamports = ctx.accounts.holding_account.lamports - dif_dist;
        **ctx.accounts.membership_key.lamports = ctx.accounts.membership_key.lamports + dif_dist;
        Ok(())
    }
    // pub fn distribute_bulk(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn close(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
}
