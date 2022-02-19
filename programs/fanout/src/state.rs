use anchor_lang::prelude::*;
use std::default::Default;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy, Debug)]
pub enum MembershipModel {
    Wallet = 0,
    Token = 1,
    NFT = 2,
}

impl Default for MembershipModel {
    fn default() -> Self {
        MembershipModel::Wallet
    }
}

#[account]
#[derive(Default, Debug)]
pub struct Fanout {
    pub authority: Pubkey,                 //32
    pub name: String,                      //50
    pub account_key: Pubkey,               //32
    pub total_shares: u64,                 //8
    pub total_members: u32,                //4
    pub total_inflow: u64,                 //8
    pub last_snapshot_amount: u64,         //8
    pub bump_seed: u8,                     //1
    pub account_owner_bump_seed: u8,       //1
    pub total_available_shares: u64,       //8
    pub membership_model: MembershipModel, //1
    pub membership_mint: Option<Pubkey>,   //32
    pub total_staked_shares: Option<u64>,  //4
}

#[account]
#[derive(Default)]
pub struct FanoutMint {
    pub mint: Pubkey,              //32
    pub fanout: Pubkey,            //32
    pub token_account: Pubkey,     //32
    pub total_inflow: u64,         //8
    pub last_snapshot_amount: u64, //8
    pub bump_seed: u8,             //1
                                   // +50 padding
}

#[account]
#[derive(Default, Debug)]
pub struct FanoutMembershipVoucher {
    pub total_inflow: u64,
    pub last_inflow: u64,
    pub bump_seed: u8,
    pub amount_at_stake: Option<u64>,
    pub shares: Option<u64>,
    pub membership_key: Option<Pubkey>,
}

#[account]
#[derive(Default)]
pub struct FanoutMembershipMintVoucher {
    pub fanout_mint: Pubkey,
    pub last_inflow: u64,
    pub bump_seed: u8,
    pub amount_at_stake: Option<u64>,
}

//(shares / 100) * (last_snapshot_amount - last_inflow)
