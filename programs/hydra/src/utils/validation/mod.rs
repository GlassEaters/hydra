use crate::error::ErrorCode;
use crate::state::{Fanout, MembershipModel};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token::TokenAccount;
use mpl_token_metadata::state::Metadata;

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
    error: Option<ProgramError>,
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        if error.is_some() {
            let err = error.unwrap();
            msg!("Derivation {:?}", err);
            return Err(err);
        }
        msg!("DerivedKeyInvalid");
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

pub fn assert_owned_by_or_owned_by(account: &AccountInfo, owner: &Pubkey, or_owner: &Pubkey) -> ProgramResult {
    if account.owner != owner || account.owner != or_owner {
        Err(ErrorCode::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn assert_membership_model(
    fanout: &Account<Fanout>,
    model: MembershipModel,
) -> Result<(), ProgramError> {
    if fanout.membership_model != model {
        return Err(ErrorCode::InvalidMembershipModel.into());
    }
    Ok(())
}

pub fn assert_ata(
    account: &AccountInfo,
    target: &Pubkey,
    mint: &Pubkey,
    err: Option<ProgramError>,
) -> Result<u8, ProgramError> {
    assert_derivation(
        &anchor_spl::associated_token::ID,
        &account.to_account_info(),
        &[
            target.as_ref(),
            anchor_spl::token::ID.as_ref(),
            mint.as_ref(),
        ],
        err,
    )
}

pub fn assert_shares_distributed(fanout: &Account<Fanout>) -> Result<(), ProgramError> {
    if fanout.total_available_shares != 0 {
        return Err(ErrorCode::SharesArentAtMax.into());
    }
    Ok(())
}

pub fn assert_holding(
    owner: &AccountInfo,
    token_account: &Account<TokenAccount>,
    mint_info: &AccountInfo,
) -> Result<(), ProgramError> {
    assert_owned_by(mint_info, &spl_token::id())?;
    let token_account_info = token_account.to_account_info();
    assert_owned_by(&token_account_info, &spl_token::id())?;
    if token_account.owner != *owner.key {
        return Err(ErrorCode::IncorrectOwner.into());
    }
    if token_account.amount < 1 {
        return Err(ErrorCode::WalletDoesNotOwnMembershipToken.into());
    }
    if token_account.mint != mint_info.key() {
        return Err(ErrorCode::MintDoesNotMatch.into());
    }
    Ok(())
}

pub fn assert_distributed(
    ix: Instruction,
    subject: &Pubkey,
    membership_model: MembershipModel,
) -> Result<(), ProgramError> {
    if ix.program_id != crate::id() {
        return Err(ErrorCode::MustDistribute.into());
    }
    let instruction_id = match membership_model {
        MembershipModel::Wallet => [252, 168, 167, 66, 40, 201, 182, 163],
        MembershipModel::NFT => [108, 240, 68, 81, 144, 83, 58, 153],
        MembershipModel::Token => [126, 105, 46, 135, 28, 36, 117, 212],
    };
    if instruction_id != ix.data[0..8] {
        return Err(ErrorCode::MustDistribute.into());
    }
    if subject != &ix.accounts[1].pubkey {
        return Err(ErrorCode::MustDistribute.into());
    }
    Ok(())
}

pub fn assert_valid_metadata(
    metadata_account: &AccountInfo,
    mint: &AccountInfo,
) -> Result<Metadata, ProgramError> {
    let meta = Metadata::from_account_info(metadata_account)?;
    if meta.mint != *mint.key {
        return Err(ErrorCode::InvalidMetadata.into());
    }
    Ok(meta)
}
