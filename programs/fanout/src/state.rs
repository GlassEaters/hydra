use anchor_lang::prelude::*;
use std::default::Default;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy)]
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
#[derive(Default)]
pub struct Fanout {
    pub authority: Pubkey,                 //32
    pub name: String,                      //50
    pub account: Pubkey,                   //32
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
#[derive(Default)]
pub struct FanoutMembershipVoucher {
    //78 bytes
    pub total_inflow: u64,            //8
    pub last_inflow: u64,             //8
    pub amount_at_stake: Option<u64>, //8
    pub bump_seed: u8,                //1
    pub shares: Option<u64>,          //4
    pub membership_key: Option<Pubkey>, //32

                                      //10 bytes padding
}

#[account]
#[derive(Default)]
pub struct FanoutMembershipMintVoucher {
    //78 bytes
    pub fanout_mint: Pubkey,          //32
    pub last_inflow: u64,             //8
    pub amount_at_stake: Option<u64>, //8
    pub bump_seed: u8,                //1
                                      //10 bytes padding
}

//(shares / 100) * (last_snapshot_amount - last_inflow)

// #[account]
// #[derive(Default)]
// pub struct FanoutV0 {
//   pub account: Pubkey, // Split account
//   pub mint: Option<Pubkey>,
//   pub total_shares: u64,
//   pub total_inflow: u128,
//   pub last_balance: u64,
//   pub total_staked: u64,

//   pub bump_seed: u8,
//   pub freeze_authority_bump_seed: u8,
//   pub account_owner_bump_seed: u8,
// }

// #[account]
// #[derive(Default)]
// pub struct FanoutVoucherV0 {
//   pub fanout: Pubkey,
//   pub account: Pubkey, // Share storage account
//   pub destination: Pubkey,
//   pub shares: u64,
//   pub inflow_at_stake: u128,
//   pub last_inflow: u128,

//   pub bump_seed: u8,
// }

// #[account]
// #[derive(Default)]
// pub struct VoucherCounterV0 {
//   pub fanout: Pubkey,
//   pub account: Pubkey, // The voucher share storage account
//   pub count: u32,

//   pub bump_seed: u8,
// }
