// use anchor_lang::prelude::*;
//
// use crate::state::{Fanout, FanoutMembershipVoucher};
//
//
//
//
//
// #[derive(Accounts)]
// pub struct DistributeWalletMember<'info> {
//     pub membership_key: UncheckedAccount<'info>,
//     #[account(
//     mut,
//     seeds = [b"fanout-membership", fanout.account_key.as_ref(), membership_key.key().as_ref()],
//     constraint = membership_account.membership_key.is_some() && membership_account.membership_key.unwrap() == membership_account.key(),
//     bump = membership_account.bump_seed,
//     )]
//     pub membership_account: Account<'info, FanoutMembershipVoucher>,
//     #[account(
//     mut,
//     seeds = [b"fanout-config", fanout.name.as_bytes()],
//     bump = fanout.bump_seed,
//     )]
//     pub fanout: Account<'info, Fanout>,
//     pub holding_account: UncheckedAccount<'info>,
//     pub system_program: Program<'info, System>,
//     pub rent: Sysvar<'info, Rent>,
// }
// //
// // pub fn distribute_for_wallet(ctx: Context<DistributeWalletMember>) -> ProgramResult {
// //     let fanout = &mut ctx.accounts.fanout;
// //     let membership_account = &mut ctx.accounts.membership_account;
// //     let member = &mut ctx.accounts.membership_key;
// //     let last_snapshot_amount = &mut fanout.last_snapshot_amount;
// //     let current_snapshot = ctx.accounts.holding_account.lamports.borrow();
// //     assert_membership_model(*fanout, MembershipModel::Wallet)?;
// //     assert_shares_distributed(*fanout)?;
// //     assert_membership_voucher_valid(*membership_account, MembershipModel::Wallet)?;
// //     //todo spl tokens
// //     let total_shares = fanout.total_shares as u64;
// //     let diff: u64 = current_snapshot
// //         .checked_sub(*last_snapshot_amount)
// //         .or_arith_error()?;
// //     fanout.total_inflow += diff;
// //     fanout.last_snapshot_amount = **current_snapshot;
// //     if diff < total_shares {
// //         //TODO - cant distribute less than total shares
// //         return Err(ErrorCode::InsufficientShares.into());
// //     }
// //     let shares = membership_account.shares.unwrap() as u64;
// //     let dif_dist = shares
// //         .checked_mul(diff)
// //         .or_arith_error()?
// //         .checked_div(total_shares)
// //         .or_arith_error()?;
// //
// //     membership_account.total_inflow += dif_dist;
// //
// //     **ctx.accounts.holding_account.lamports.borrow_mut() =
// //         **ctx.accounts.holding_account.lamports.borrow() - dif_dist;
// //     **ctx.accounts.membership_key.lamports.borrow_mut() =
// //         **ctx.accounts.membership_key.lamports.borrow() + dif_dist;
// //
// //     Ok(())
// // }
