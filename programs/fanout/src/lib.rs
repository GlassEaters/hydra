pub mod error;
pub mod processors;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use processors::*;
use state::MembershipModel;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
#[program]
pub mod fanout {
    use super::*;

    pub fn process_init(
        ctx: Context<InitializeFanout>,
        args: InitializeFanoutArgs,
        model: MembershipModel,
    ) -> ProgramResult {
        init(ctx, args, model)
    }

    pub fn process_init_for_mint(
        ctx: Context<InitializeFanoutForMint>,
        bump_seed: u8,
    ) -> ProgramResult {
        init_for_mint(ctx, bump_seed)
    }

    pub fn process_add_member_wallet(
        ctx: Context<AddMemberWallet>,
        args: AddMemberArgs,
    ) -> ProgramResult {
        add_member_wallet(ctx, args)
    }

    pub fn process_add_member_nft(
        ctx: Context<AddMemberWithNFT>,
        args: AddMemberArgs,
    ) -> ProgramResult {
        add_member_nft(ctx, args)
    }

    pub fn process_add_member_token(
        ctx: Context<AddMemberWithToken>,
        args: AddMemberArgs,
    ) -> ProgramResult {
        add_member_token(ctx, args)
    }

    pub fn process_distribute_nft(
        ctx: Context<DistributeNftMember>,
        fanout_membership_mint_bump_seed: u8,
        distribute_for_mint: bool,
    ) -> ProgramResult {
        distribute_for_nft(ctx, fanout_membership_mint_bump_seed, distribute_for_mint)
    }
}

// pub fn close(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}

// pub fn stake_token_member(ctx: Context<StakeTokenMenber>) -> ProgramResult {
//     Ok(())
// }

// pub fn unstake_token_member(ctx: Context<AddMemberWithNFT>) -> ProgramResult {
//     Ok(())
// }

// pub fn transfer_shares(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {

// }
// pub fn remove_member(ctx: Context<AddMember>, args: AddMemberArgs) -> ProgramResult {}
// pub fn distribute_mint(ctx: Context) -> ProgramResult {
//     //TODO UPSERT membership mint account
//     Ok(())
// }
