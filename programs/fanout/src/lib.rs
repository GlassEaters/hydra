use crate::account::*;
use crate::arg::*;
use crate::error::*;
use crate::state::*;
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

    use anchor_spl::token::accessor::authority;

    use super::*;

    pub fn init(ctx: Context<InitializeFanout>, args: InitializeFanoutArgs) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        fanout.authority = ctx.accounts.authority.to_account_info().key();
        fanout.account = ctx.accounts.holding_account.to_account_info().key();
        fanout.name = args.name;
        fanout.total_shares = args.total_shares;
        fanout.total_available_shares = args.total_shares;
        let account = &ctx.accounts.holding_account;
        fanout.total_inflow = account.to_account_info().lamports();
        fanout.last_snapshot_amount = 0;
        fanout.bump_seed = args.bump_seed;
        fanout.account_owner_bump_seed = args.account_owner_bump_seed;
        fanout.membership_model = args.membership_model;
        fanout.membership_mint = if ctx.accounts.membership_mint.to_account_info().key()
            == spl_token::native_mint::id()
        {
            None
        } else {
            Some(ctx.accounts.membership_mint.to_account_info().key())
        };

        match fanout.membership_model {
            MembershipModel::Wallet | MembershipModel::NFT => {
                fanout.membership_mint = None;
            }
            MembershipModel::Token => {
                if fanout.membership_mint.is_none() {
                    return Err(ErrorCode::MintAccountRequired.into());
                }
                let mint = ctx.accounts.membership_mint;
                if mint.is_initialized {
                    return Err(ErrorCode::NewMintAccountRequired.into());
                } else {
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let accounts = anchor_spl::token::InitializeMint {
                        mint: mint.to_account_info(),
                        rent: ctx.accounts.rent.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new(cpi_program, accounts);
                    anchor_spl::token::initialize_mint(
                        cpi_ctx,
                        0,
                        &ctx.accounts.authority.to_account_info().key(),
                        Some(&ctx.accounts.authority.to_account_info().key()),
                    )?;
                }
            }
        };

        Ok(())
    }

    pub fn add_member_wallet(ctx: Context<AddMemberWithNFT>, args: AddMemberArgs) -> ProgramResult {
        Ok(())
    }

    pub fn add_member_nft(ctx: Context<AddMemberWithNFT>, args: AddMemberArgs) -> ProgramResult {
        Ok(())
    }

    pub fn add_member_token(
        ctx: Context<AddMemberWithToken>,
        args: AddMemberArgs,
    ) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let authority = ctx.accounts.authority.to_account_info();
        let authority_key = authority.key();
        let mint = ctx.accounts.membership_mint.to_account_info();
        fanout.total_members = fanout.total_members.checked_add(1).or_arith_error()?;

        //TODO safe math
        let less_shares = fanout
            .total_available_shares
            .checked_sub(args.shares)
            .or_arith_error()?;
        fanout.total_members = fanout.total_members.checked_add(1).or_arith_error()?;
        fanout.total_available_shares = less_shares;

        if less_shares > 0 {
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let accounts = anchor_spl::token::MintTo {
                mint: mint.to_account_info(),
                to: ctx.accounts.shares_account.to_account_info(),
                authority: authority,
            };
            let cpi_ctx = CpiContext::new(cpi_program, accounts);
            anchor_spl::token::mint_to(cpi_ctx, args.shares as u64)?;
        } else {
            return Err(ErrorCode::InsufficientShares.into());
        }
        Ok(())
    }

    pub fn stake_token_member(ctx: Context<StakeTokenMenber>) -> ProgramResult {
        Ok(())
    }

    pub fn unstake_token_member(ctx: Context<AddMemberWithNFT>) -> ProgramResult {
        Ok(())
    }

    // pub fn transfer_shares(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn remove_member(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn distribute_mint(ctx: Context) -> ProgramResult {
    //     //TODO UPSERT membership mint account
    //     Ok(())
    // }

    pub fn distribute(ctx: Context<DistributeMember>) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let membership_account = &mut ctx.accounts.membership_account;
        let member = &mut ctx.accounts.membership_key;
        let last_snapshot_amount = &mut fanout.last_snapshot_amount;
        let current_snapshot = ctx.accounts.holding_account.lamports.borrow();

        // let is_member, shares = match fanout.membership_model {
        //     MembershipModel::Wallet =>
        // }

        if fanout.total_available_shares != 0 {
            //does not allow for disrtubution before all members are added
            return Err(ErrorCode::SharesArentAtMax.into());
        }

        //todo spl tokens
        let total_shares = fanout.total_shares as u64;
        let diff: u64 = current_snapshot
            .checked_sub(*last_snapshot_amount)
            .or_arith_error()?;
        fanout.total_inflow += diff;
        fanout.last_snapshot_amount = **current_snapshot;
        if diff < total_shares {
            //TODO - cant distribute less than total shares
            return Err(ErrorCode::InsufficientShares.into());
        }
        let dif_dist = (membership_account.shares as u64)
            .checked_mul(diff)
            .or_arith_error()?
            .checked_div(total_shares)
            .or_arith_error()?;

        membership_account.total_inflow += dif_dist;

        **ctx.accounts.holding_account.lamports.borrow_mut() =
            **ctx.accounts.holding_account.lamports.borrow() - dif_dist;
        **ctx.accounts.membership_key.lamports.borrow_mut() =
            **ctx.accounts.membership_key.lamports.borrow() + dif_dist;

        Ok(())
    }
    // pub fn distribute_bulk(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn close(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
}
