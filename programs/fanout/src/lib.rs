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
    use crate::instruction::DistributeMember;

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

        if less_shares > 0 {
            membership_account.shares = args.shares;
            membership_account.total_inflow = 0;
            membership_account.bump_seed = args.voucher_bump_seed;
        } else {
            return Err(ErrorCode::InsufficientShares.into());
        }
        Ok(())
    }

    // pub fn transfer_shares(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn remove_member(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    pub fn distribute_member(ctx: Context<DistributeMember>) -> ProgramResult {}
    // pub fn distribute_bulk(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn close(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
}
