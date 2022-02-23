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
        distribute_for_mint: bool,
    ) -> ProgramResult {
        distribute_for_nft(ctx, distribute_for_mint)
    }

    pub fn process_distribute_wallet(
        ctx: Context<DistributeWalletMember>,
        distribute_for_mint: bool,
    ) -> ProgramResult {
        distribute_for_wallet(ctx, distribute_for_mint)
    }
}
