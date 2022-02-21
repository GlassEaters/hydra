use crate::error::ErrorCode;
use crate::state::FANOUT_MINT_MEMBERSHIP_VOUCHER_SIZE;
use crate::state::{
    Fanout, FanoutMembershipMintVoucher, FanoutMembershipVoucher, FanoutMint, MembershipModel,
    HOLDING_ACCOUNT_SIZE,
};
use crate::utils::create_or_allocate_account_raw;
use crate::utils::logic::calculation::*;
use crate::utils::validation::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use std::convert::TryInto;

#[derive(Accounts)]
#[instruction(fanout_membership_mint_bump_seed: u8, distribute_for_mint: bool)]
pub struct DistributeNftMember<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub member: UncheckedAccount<'info>,
    #[
    account(
    mut,
    constraint = membership_mint_token_account.delegate.is_none(),
    constraint = membership_mint_token_account.close_authority.is_none(),
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
    #[account(mut)]
    pub fanout_for_mint: UncheckedAccount<'info>,
    #[account(mut)]
    pub fanout_for_mint_membership_voucher: UncheckedAccount<'info>,
    pub fanout_mint: Account<'info, Mint>,
    #[account(mut)]
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
    let membership_voucher_info = membership_voucher.to_account_info();
    let member = &mut ctx.accounts.member;
    let total_shares = fanout.total_shares as u64;
    let holding_account = &mut ctx.accounts.holding_account;
    let holding_account_key = holding_account.to_account_info().key();
    let membership_mint_token_account = &ctx.accounts.membership_mint_token_account;
    let membership_key = &ctx.accounts.membership_key;
    assert_owned_by(&fanout_info, &crate::ID)?;
    assert_owned_by(&membership_voucher_info, &crate::ID)?;
    assert_owned_by(&member.to_account_info(), &System::id())?;
    assert_membership_model(fanout, MembershipModel::NFT)?;
    assert_shares_distributed(fanout)?;
    assert_membership_voucher_valid(membership_voucher, MembershipModel::NFT)?;
    assert_holding(
        &member.to_account_info(),
        membership_mint_token_account,
        &membership_key.to_account_info(),
    )?;
    if distribute_for_mint {
        let fanout_for_mint_membership_voucher_info = ctx
            .accounts
            .fanout_for_mint_membership_voucher
            .to_account_info();
        let fanout_for_mint_membership_voucher_unchecked =
            &mut ctx.accounts.fanout_for_mint_membership_voucher;
        let fanout_mint_member_token_account_info = ctx
            .accounts
            .fanout_mint_member_token_account
            .to_account_info();
        let fanout_mint = &ctx.accounts.fanout_mint;
        assert_owned_by(&ctx.accounts.fanout_for_mint.to_account_info(), &crate::ID)?;
        assert_owned_by(&fanout_mint_member_token_account_info, &Token::id())?;
        assert_owned_by(holding_account, &anchor_spl::token::Token::id())?;
        let fanout_mint_bump = assert_derivation(
            &crate::ID,
            &ctx.accounts.fanout_for_mint,
            &[
                b"fanout-config",
                &fanout.key().as_ref(),
                &ctx.accounts.fanout_mint.key().as_ref(),
            ],
            Some(ErrorCode::InvalidFanoutForMint.into()),
        )?;
        let mint_membership_voucher_bump = assert_derivation(
            &crate::ID,
            &fanout_for_mint_membership_voucher_info,
            &[
                b"fanout-membership",
                &ctx.accounts.fanout_for_mint.key().as_ref(),
                &membership_key.key().as_ref(),
                &ctx.accounts.fanout_mint.key().as_ref(),
            ],
            Some(ErrorCode::InvalidMembershipVoucher.into()),
        )?;
        assert_fanout_mint_ata(
            &holding_account.to_account_info(),
            &fanout.key(),
            &ctx.accounts.fanout_mint.key(),
        )?;
        let mint_voucher_empty = fanout_for_mint_membership_voucher_info.data_is_empty();
        let fanout_for_mint_membership_voucher: &mut FanoutMembershipMintVoucher =
            &mut if mint_voucher_empty {
                create_or_allocate_account_raw(
                    crate::ID,
                    &fanout_for_mint_membership_voucher_info,
                    &ctx.accounts.rent.to_account_info(),
                    &ctx.accounts.system_program,
                    &ctx.accounts.payer.to_account_info(),
                    FANOUT_MINT_MEMBERSHIP_VOUCHER_SIZE,
                    &[],
                    &[
                        b"fanout-membership",
                        &ctx.accounts.fanout_for_mint.key().as_ref(),
                        &membership_key.key().as_ref(),
                        &ctx.accounts.fanout_mint.key().as_ref(),
                        &[mint_membership_voucher_bump],
                    ],
                )?;
                FanoutMembershipMintVoucher {
                    fanout_mint: fanout_mint.key(),
                    last_inflow: 0,
                    bump_seed: mint_membership_voucher_bump,
                    amount_at_stake: None,
                }
            } else {
                let mut membership_data: &[u8] =
                    &fanout_for_mint_membership_voucher_unchecked.try_borrow_mut_data()?;
                assert_owned_by(&fanout_for_mint_membership_voucher_info, &crate::ID)?;
                let membership =
                    FanoutMembershipMintVoucher::try_deserialize(&mut membership_data)?;
                if membership.bump_seed != mint_membership_voucher_bump {
                    msg!("Mint Membership Bump Doesnt match");
                    return Err(ErrorCode::InvalidMembershipVoucher.into());
                }
                membership
            };
msg!("dkjhkfj");
        let mut holding_account_data: &[u8] = &holding_account.try_borrow_data()?;

        let holding_account_ata = TokenAccount::try_deserialize(&mut holding_account_data)?;
        if holding_account_ata.owner != fanout.key() {
            msg!("Ata has wrong owner");
            return Err(ProgramError::IllegalOwner);
        }
        let mut fanout_mint_data: &[u8] = &ctx.accounts.fanout_for_mint.try_borrow_data()?;
        let fanout_mint: &mut FanoutMint = &mut FanoutMint::try_deserialize(&mut fanout_mint_data)?;
        if fanout_mint_bump != fanout_mint.bump_seed {
            msg!("InvalidFanoutForMint");
            return Err(ErrorCode::InvalidFanoutForMint.into());
        }
        if holding_account_key != fanout_mint.token_account {
            return Err(ErrorCode::InvalidHoldingAccount.into());
        }
        let mint = &ctx.accounts.fanout_mint;
        if fanout_mint.mint != mint.to_account_info().key() {
            return Err(ErrorCode::MintDoesNotMatch.into());
        }
        let mut fanout_mint_member_token_account_data: &[u8] =
            &fanout_mint_member_token_account_info.try_borrow_data()?;
        let fanout_mint_member_token_account_object =
            TokenAccount::try_deserialize(&mut fanout_mint_member_token_account_data)?;
        if &fanout_mint_member_token_account_object.owner != &member.key() {
            msg!("FanoutMint Token Account wrong owner");
            return Err(ErrorCode::IncorrectOwner.into());
        }
        let current_snapshot = holding_account_ata.amount;
        update_inflow_for_mint(fanout, fanout_mint, current_snapshot)?;
        let inflow_diff = calculate_inflow_change(
            fanout_mint.total_inflow,
            fanout_for_mint_membership_voucher.last_inflow,
        )?;
        let shares = membership_voucher.shares.unwrap() as u64;
        let dif_dist = calculate_dist_amount(shares, inflow_diff, total_shares)?;
        update_snapshot_for_mint(fanout_mint, fanout_for_mint_membership_voucher, dif_dist)?;

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let accounts = anchor_spl::token::Transfer {
            from: holding_account.to_account_info(),
            to: ctx
                .accounts
                .fanout_mint_member_token_account
                .to_account_info(),
            authority: fanout_info,
        };
        let cpi_ctx = CpiContext::new(cpi_program, accounts);

        let seeds = [
            b"fanout-config".as_ref(),
            fanout.name.as_bytes(),
            &[fanout.bump_seed],
        ];
        anchor_spl::token::transfer(cpi_ctx.with_signer(&[&seeds]), dif_dist as u64)?;
    } else {
        //TODO make this resuable
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
