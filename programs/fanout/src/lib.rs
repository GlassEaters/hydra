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

pub mod fanout_logic {
    pub fn distribute_logic() {}
}
#[program]
pub mod fanout {

    use anchor_spl::token::TokenAccount;

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
        fanout.last_snapshot_amount = fanout.total_inflow;
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

        ctx.accounts.holding_account.owner = fanout.key();

        match fanout.membership_model {
            MembershipModel::Wallet | MembershipModel::NFT => {
                fanout.membership_mint = None;
                fanout.total_staked_shares = None;
            }
            MembershipModel::Token => {
                if fanout.membership_mint.is_none() {
                    return Err(ErrorCode::MintAccountRequired.into());
                }
                let mint = ctx.accounts.membership_mint;
                fanout.total_staked_shares = Some(0);
                if !mint.is_initialized {
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

    pub fn init_for_mint(
        ctx: Context<InitializeFanoutForMint>,
        args: InitializeFanoutForMintArgs,
    ) -> ProgramResult {
        let fanout_mint = &mut ctx.accounts.fanout_mint;
        let fanout = &ctx.accounts.fanout;
        let mint_holding_account = &ctx.accounts.mint_holding_account.to_account_info();
        fanout_mint.fanout = fanout.to_account_info().key();
        fanout_mint.total_inflow = mint_holding_account.amount;
        fanout_mint.last_snapshot_amount = fanout.total_inflow;
        fanout_mint.bump_seed = args.bump_seed;
        assert_derivation(
            anchor_spl::associated_token::ID,
            mint_holding_account,
            [
                fanout.account.as_ref(),
                anchor_spl::token::ID,
                ctx.accounts.mint.to_account_info().key(),
            ],
        );
        fanout_mint.token_account = mint_holding_account.to_account_info().key();
        Ok(())
    }

    pub fn add_member_wallet(ctx: Context<AddMemberWallet>, args: AddMemberArgs) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let account = ctx.accounts.account.to_account_info();
        let membership_account = &mut ctx.accounts.membership_account;
        let authority = ctx.accounts.authority.to_account_info();
        fanout = &mut update_fanout_for_add(fanout.clone(), args.shares)?;
        membership_account.membership_key = Some(account.key());
        membership_account.shares = Some(args.shares);
        Ok(())
    }

    pub fn add_member_nft(ctx: Context<AddMemberWithNFT>, args: AddMemberArgs) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let account = ctx.accounts.account.to_account_info();
        let membership_account = &mut ctx.accounts.membership_account;
        let authority = ctx.accounts.authority.to_account_info();
        fanout = &mut update_fanout_for_add(fanout.clone(), args.shares)?;
        membership_account.membership_key = Some(ctx.accounts.mint.to_account_info().key());
        membership_account.shares = Some(args.shares);
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
        fanout = &mut update_fanout_for_add(fanout.clone(), args.shares)?; //Immutable borrow and replace I just cant get my FP out of me.
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let accounts = anchor_spl::token::MintTo {
            mint: mint.to_account_info(),
            to: ctx.accounts.membership_mint_token_account.to_account_info(),
            authority: authority,
        };
        let cpi_ctx = CpiContext::new(cpi_program, accounts);
        anchor_spl::token::mint_to(cpi_ctx, args.shares as u64)?;
        Ok(())
    }

    pub fn stake_token_member(ctx: Context<StakeTokenMenber>) -> ProgramResult {
        Ok(())
    }

    pub fn unstake_token_member(ctx: Context<AddMemberWithNFT>) -> ProgramResult {
        Ok(())
    }

    // pub fn transfer_shares(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {

    // }
    // pub fn remove_member(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
    // pub fn distribute_mint(ctx: Context) -> ProgramResult {
    //     //TODO UPSERT membership mint account
    //     Ok(())
    // }

    pub fn distribute_for_wallet(ctx: Context<DistributeWalletMember>) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let membership_account = &mut ctx.accounts.membership_account;
        let member = &mut ctx.accounts.membership_key;
        let last_snapshot_amount = &mut fanout.last_snapshot_amount;
        let current_snapshot = ctx.accounts.holding_account.lamports.borrow();
        assert_membership_model(*fanout, MembershipModel::Wallet)?;
        assert_shares_distrubuted(*fanout)?;
        assert_membership_voucher_valid(*membership_account, MembershipModel::Wallet)?;
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
        let shares = membership_account.shares.unwrap() as u64;
        let dif_dist = shares
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

    pub fn distribute_for_nft(
        ctx: Context<DistributeNFTMember>,
        args: DistributeMemberArgs,
    ) -> ProgramResult {
        let fanout = &mut ctx.accounts.fanout;
        let membership_account = &mut ctx.accounts.membership_account;
        let member = &mut ctx.accounts.member;
        let total_shares = fanout.total_shares as u64;
        let holding_account = &mut ctx.accounts.holding_account;
        let holding_account_key = holding_account.to_account_info().key();
        assert_membership_model(*fanout, MembershipModel::NFT)?;
        assert_shares_distrubuted(*fanout)?;
        assert_membership_voucher_valid(*membership_account, MembershipModel::NFT)?;
        if args.mint.is_some() {
            assert_owned_by(ctx.accounts.fanout_mint, fanout::ID)?;
            assert_owned_by(ctx.accounts.fanout_mint_membership, fanout::ID)?;

            let fanout_mint = FanoutMint::try_deserialize(ctx.accounts.fanout_mint)?;
            let fanout_mint_membership_account =
                FanoutMembershipMintVoucher::try_deserialize(ctx.accounts.fanout_mint_membership)?;
            let mint = ctx.accounts.mint;
            if fanout_mint.mint != mint.to_account_info().key() {
                return Err(ErrorCode::MintDoesNotMatch.into());
            }
            assert_derivation(
                anchor_spl::associated_token::ID,
                holding_account,
                [
                    fanout.account.as_ref(),
                    anchor_spl::token::ID,
                    ctx.accounts.mint.to_account_info().key(),
                ],
            )
            .map_err(ErrorCode::HoldingAccountMustBeAnATA.into())?;
            assert_owned_by(holding_account, fanout.key())?;
            if holding_account_key != fanout_mint.token_account {
                return Err(ErrorCode::InvalidHoldingAccount.into());
            }
            let holding_account_ata = TokenAccount::try_deserialize(holding_account)?;
            let last_snapshot_amount = &mut fanout_mint.last_snapshot_amount;
            let current_snapshot = holding_account_ata.amount;
            //todo spl tokens
            update_inflow(fanout, **current_snapshot);
            let inflow_diff =
                calulate_inflow_change(fanout.total_inflow, membership_account.last_inflow)?;
            let shares = membership_account.shares.unwrap() as u64;
            let dif_dist = calculate_dist_amount(shares, inflow_diff, total_shares)?;
            update_snapshot(fanout, membership_account, dif_dist);
        } else {
            if holding_account_key != fanout.account {
                return Err(ErrorCode::InvalidHoldingAccount.into());
            }
            let last_snapshot_amount = &mut fanout.last_snapshot_amount;
            let current_snapshot = ctx.accounts.holding_account.lamports.borrow();
            //todo spl tokens
            update_inflow(fanout, **current_snapshot);
            let inflow_diff =
                calulate_inflow_change(fanout.total_inflow, membership_account.last_inflow)?;
            let shares = membership_account.shares.unwrap() as u64;
            let dif_dist = calculate_dist_amount(shares, inflow_diff, total_shares)?;
            update_snapshot(fanout, membership_account, dif_dist);
            **ctx.accounts.holding_account.lamports.borrow_mut() =
                **ctx.accounts.holding_account.lamports.borrow() - dif_dist;
            **ctx.accounts.member.lamports.borrow_mut() =
                **ctx.accounts.member.lamports.borrow() + dif_dist;
        }
        Ok(())
    }

    // pub fn close(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
}
