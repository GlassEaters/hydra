use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::ErrorCode;
use crate::state::{
    Fanout, FanoutMembershipMintVoucher, FanoutMembershipVoucher, FanoutMint, MembershipModel,
    HOLDING_ACCOUNT_SIZE,
};
use crate::utils::logic::calculation::*;
use crate::utils::validation::*;

#[derive(Accounts)]
#[instruction(fanout_membership_mint_bump_seed: u8, distribute_for_mint: bool)]
pub struct DistributeNftMember<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub member: UncheckedAccount<'info>,
    #[
    account(
    mut,
    constraint = membership_mint_token_account.delegate.is_none(),
    constraint = membership_mint_token_account.close_authority.is_none(),
    constraint = membership_mint_token_account.mint == membership_key.key(),
    constraint = membership_mint_token_account.amount == 1,
    )]
    pub membership_mint_token_account: Account<'info, TokenAccount>,
    pub membership_key: Account<'info, Mint>,
    #[account(
    mut,
    seeds = [b"fanout-membership", fanout.key().as_ref(), membership_key.key().as_ref()],
    constraint = membership_voucher.membership_key == Some(membership_key.key()),
    bump = membership_voucher.bump_seed,
    )]
    pub membership_voucher: Box<Account<'info, FanoutMembershipVoucher>>,
    #[account(
    mut,
    seeds = [b"fanout-config", fanout.name.as_bytes()],
    bump = fanout.bump_seed,
    )]
    pub fanout: Account<'info, Fanout>,
    #[account(mut)]
    pub holding_account: UncheckedAccount<'info>,
    pub fanout_for_mint: UncheckedAccount<'info>,
    pub fanout_for_mint_membership_voucher: UncheckedAccount<'info>,
    pub fanout_mint: Account<'info, Mint>,
    pub fanout_mint_member_token_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

pub fn distribute_for_nft(
    ctx: Context<DistributeNftMember>,
    _fanout_membership_mint_bump_seed: u8,
    distribute_for_mint: bool,
) -> ProgramResult {
    let fanout = &mut ctx.accounts.fanout;
    let fanout_info = fanout.to_account_info();
    let membership_voucher = &mut ctx.accounts.membership_voucher;
    let member = &mut ctx.accounts.member;
    let total_shares = fanout.total_shares as u64;
    let holding_account = &mut ctx.accounts.holding_account;
    let holding_account_key = holding_account.to_account_info().key();
    let membership_mint_token_account = &ctx.accounts.membership_mint_token_account;
    let membership_key = &ctx.accounts.membership_key;
    assert_membership_model(fanout, MembershipModel::NFT)?;
    assert_shares_distributed(fanout)?;
    assert_membership_voucher_valid(membership_voucher, MembershipModel::NFT)?;
    assert_holding(
        &member.to_account_info(),
        membership_mint_token_account,
        &membership_key.to_account_info(),
    )?;

    if distribute_for_mint {
        assert_owned_by(&ctx.accounts.fanout_for_mint.to_account_info(), &crate::ID)?;
        assert_owned_by(
            &ctx.accounts
                .fanout_for_mint_membership_voucher
                .to_account_info(),
            &crate::ID,
        )?;
        let _mint_membership_voucher_bump = assert_derivation(
            &crate::ID,
            &ctx.accounts.fanout_for_mint_membership_voucher,
            &[
                b"fanout-membership",
                &ctx.accounts.fanout_for_mint.key().as_ref(),
                &ctx.accounts
                    .fanout_for_mint_membership_voucher
                    .key()
                    .as_ref(),
                &ctx.accounts.fanout_mint.key().as_ref(),
            ],
            Some(ErrorCode::InvalidMembershipVoucher.into()),
        )?;
        //TODO -> if the voucher doesnt exist create it
        if ctx.accounts.fanout_for_mint_membership_voucher.data_len() == 0 {
            //TODO -> CREATE ACCOUNT
        }
        let mut fanout_mint_data: &[u8] = &ctx.accounts.fanout_for_mint.try_borrow_data()?;
        let fanout_mint = FanoutMint::try_deserialize(&mut fanout_mint_data)?;
        let mut mint_membership_account_data: &[u8] = &ctx
            .accounts
            .fanout_for_mint_membership_voucher
            .try_borrow_data()?;
        let _fanout_mint_membership_account =
            FanoutMembershipMintVoucher::try_deserialize(&mut mint_membership_account_data)?;
        let mint = &ctx.accounts.fanout_mint;
        if fanout_mint.mint != mint.to_account_info().key() {
            return Err(ErrorCode::MintDoesNotMatch.into());
        }
        assert_derivation(
            &anchor_spl::associated_token::ID,
            holding_account,
            &[
                fanout.account_key.as_ref(),
                anchor_spl::token::ID.as_ref(),
                ctx.accounts.fanout_mint.key().as_ref(),
            ],
            Some(ErrorCode::HoldingAccountMustBeAnATA.into()),
        )?;
        assert_owned_by(holding_account, &anchor_spl::token::Token::id())?;
        if holding_account_key != fanout_mint.token_account {
            return Err(ErrorCode::InvalidHoldingAccount.into());
        }
        let mut holding_account_data: &[u8] = &holding_account.try_borrow_data()?;
        let holding_account_ata = TokenAccount::try_deserialize(&mut holding_account_data)?;
        if holding_account_ata.owner != fanout.key() {
            return Err(ProgramError::IllegalOwner);
        }
        let _last_snapshot_amount = fanout_mint.last_snapshot_amount;
        let current_snapshot = holding_account_ata.amount;
        update_inflow(fanout, current_snapshot)?;
        let inflow_diff =
            calculate_inflow_change(fanout.total_inflow, membership_voucher.last_inflow)?;
        let shares = membership_voucher.shares.unwrap() as u64;
        let dif_dist = calculate_dist_amount(shares, inflow_diff, total_shares)?;
        update_snapshot(fanout, membership_voucher, dif_dist)?;
        if ctx.accounts.membership_mint_token_account.owner != *member.owner {
            return Err(ErrorCode::WalletDoesNotOwnMembershipToken.into());
        }
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let accounts = anchor_spl::token::Transfer {
            from: holding_account.to_account_info(),
            to: member.to_account_info(),
            authority: fanout_info,
        };
        let cpi_ctx = CpiContext::new(cpi_program, accounts);
        let mint_key = mint.key();
        let holding_account_key = holding_account.key();
        let seeds = [
            b"fanout-config".as_ref(),
            holding_account_key.as_ref(),
            mint_key.as_ref(),
            &[fanout_mint.bump_seed],
        ];
        anchor_spl::token::transfer(cpi_ctx.with_signer(&[&seeds[..]]), dif_dist as u64)?;
    } else {
        if holding_account_key != fanout.account_key {
            return Err(ErrorCode::InvalidHoldingAccount.into());
        }
        let current_snapshot = ctx.accounts.holding_account.lamports();
        let current_snapshot_less_min =
            current_lamports(&ctx.accounts.rent, HOLDING_ACCOUNT_SIZE, current_snapshot)?;

        let minimum = fanout.total_members as u64;
        if current_snapshot.le(&minimum) {
            return Err(ErrorCode::InsufficientBalanceToDistribute.into());
        }
        update_inflow(fanout, current_snapshot_less_min)?;
        let inflow_diff =
            calculate_inflow_change(fanout.total_inflow, membership_voucher.last_inflow)?;
        let shares = membership_voucher.shares.unwrap() as u64;
        let dif_dist = calculate_dist_amount(shares, inflow_diff, total_shares)?;
        update_snapshot(fanout, membership_voucher, dif_dist)?;
        **ctx.accounts.holding_account.lamports.borrow_mut() = current_snapshot
            .checked_sub(dif_dist)
            .ok_or(ErrorCode::NumericalOverflow)?;
        **ctx.accounts.member.lamports.borrow_mut() = member
            .lamports()
            .checked_add(dif_dist)
            .ok_or(ErrorCode::NumericalOverflow)?;
        membership_voucher.total_inflow = membership_voucher
            .total_inflow
            .checked_add(dif_dist)
            .ok_or(ErrorCode::NumericalOverflow)?;
    }
    Ok(())
}
