use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{Fanout, FanoutMembershipVoucher, MembershipModel},
};

pub trait OrArithError<T> {
    fn or_arith_error(self) -> Result<T, ProgramError>;
}

impl OrArithError<u64> for Option<u64> {
    fn or_arith_error(self) -> Result<u64, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

impl OrArithError<u32> for Option<u32> {
    fn or_arith_error(self) -> Result<u32, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

impl OrArithError<u128> for Option<u128> {
    fn or_arith_error(self) -> Result<u128, ProgramError> {
        self.ok_or(ErrorCode::BadArtithmetic.into())
    }
}

pub fn update_fanout_for_add(
    fanout: &mut Account<Fanout>,
    shares: u64,
) -> Result<(), ProgramError> {
    let less_shares = fanout
        .total_available_shares
        .checked_sub(shares)
        .or_arith_error()?;
    fanout.total_members = fanout.total_members.checked_add(1).or_arith_error()?;
    fanout.total_available_shares = less_shares;
    if less_shares > 0 {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientShares.into())
    }
}

pub fn assert_membership_model(
    fanout: &Account<Fanout>,
    model: MembershipModel,
) -> Result<(), ProgramError> {
    if fanout.membership_model == model {
        return Err(ErrorCode::InvalidMembershipModel.into());
    }
    Ok(())
}

pub fn assert_shares_distrubuted(fanout: &Account<Fanout>) -> Result<(), ProgramError> {
    if fanout.total_available_shares != 0 {
        //does not allow for disrtubution before all members are added
        return Err(ErrorCode::SharesArentAtMax.into());
    }
    Ok(())
}

pub fn assert_membership_voucher_valid(
    voucher: &Account<FanoutMembershipVoucher>,
    model: MembershipModel,
) -> Result<(), ProgramError> {
    match model {
        MembershipModel::Wallet | MembershipModel::NFT => {
            if voucher.shares.is_none() || voucher.membership_key.is_none() {
                return Err(ErrorCode::InvalidMembershipVoucher.into());
            }
        }
        MembershipModel::Token => {
            if voucher.shares.is_some()
                || voucher.membership_key.is_some()
                || voucher.amount_at_stake.is_none()
            {
                return Err(ErrorCode::InvalidMembershipVoucher.into());
            }
        }
    }
    Ok(())
}

pub fn calulate_inflow_change(total_inflow: u64, last_inflow: u64) -> Result<u64, ProgramError> {
    let diff: u64 = total_inflow.checked_sub(last_inflow).or_arith_error()?;
    Ok(diff)
}

pub fn calculate_dist_amount(
    member_shares: u64,
    inflow_diff: u64,
    total_shares: u64,
) -> Result<u64, ProgramError> {
    let member_shares = member_shares as u128;
    let total_shares = total_shares as u128;
    let inflow_diff = inflow_diff as u128;
    let dist_amount = member_shares
        .checked_mul(inflow_diff)
        .or_arith_error()?
        .checked_div(total_shares)
        .or_arith_error()?;
    Ok(dist_amount as u64)
}

pub fn update_inflow(
    fanout: &mut Account<Fanout>,
    current_snapshot: u64,
) -> Result<(), ProgramError> {
    let diff = current_snapshot
        .checked_sub(fanout.last_snapshot_amount)
        .or_arith_error()?;
    fanout.total_inflow = fanout.total_inflow.checked_add(diff).or_arith_error()?;
    if fanout.total_staked_shares.is_some() && fanout.total_staked_shares.unwrap() > 0 {
        let tss = fanout.total_staked_shares.unwrap();
        let shares_diff = (fanout.total_shares as u64)
            .checked_sub(tss)
            .or_arith_error()?;
        let unstaked_correction = diff
            .checked_mul(shares_diff)
            .or_arith_error()?
            .checked_div(tss)
            .or_arith_error()?;
        fanout.total_inflow += unstaked_correction;
    }
    fanout.last_snapshot_amount = current_snapshot;
    Ok(())
}

pub fn update_snapshot(
    fanout: &mut Account<Fanout>,
    fanout_voucher: &mut Account<FanoutMembershipVoucher>,
    distrobution_amount: u64,
) -> Result<(), ProgramError> {
    fanout_voucher.last_inflow = fanout.total_inflow;
    fanout.last_snapshot_amount = fanout
        .last_snapshot_amount
        .checked_sub(distrobution_amount)
        .or_arith_error()?;
    Ok(())
}

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
    error: Option<ProgramError>,
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        if error.is_some() {
            return Err(error.unwrap());
        }
        return Err(ErrorCode::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(ErrorCode::IncorrectOwner.into())
    } else {
        Ok(())
    }
}
