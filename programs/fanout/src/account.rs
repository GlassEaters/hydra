    use anchor_lang::{
        prelude::*,
        solana_program::program::{invoke, invoke_signed},
    };
    use anchor_spl::{
        token::{Mint, Token, TokenAccount},
    };

    use crate::arg::*;
    use crate::state::*;

    #[derive(Accounts)]
    #[instruction(args: InitializeFanoutArgs)]
    pub struct InitializeFanout<'info> {
        pub authority: Signer<'info>,
        #[account(
            init,
            space = 300,
            seeds = [b"fanout-config", args.name.as_bytes()],
            bump = args.bump_seed,
            payer = authority
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            space = 1,
            seeds = [b"fanout-native-account", fanout.key().as_ref()],
            bump = args.native_account_bump_seed,
            payer = authority
        )
        ]
        pub holding_account: UncheckedAccount<'info>,
        pub system_program: Program<'info, System>,
        pub membership_mint: Account<'info, Mint>,
        pub rent: Sysvar<'info, Rent>,
        pub token_program: Program<'info, Token>,
    }

    #[derive(Accounts)]
    #[instruction(bump_seed: u8)]
    pub struct InitializeFanoutForMint<'info> {
        pub authority: Signer<'info>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.name.as_bytes()],
            has_one = authority,
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            payer=authority,
            space = 200,
            seeds = [b"fanout-config", fanout.key().as_ref(), mint.key().as_ref()],
            bump = bump_seed
        )]
        pub fanout_for_mint: Account<'info, FanoutMint>,
        #[account(
            mut,
            constraint = mint_holding_account.owner == fanout.account, // must create and assign ownership first
            constraint = mint_holding_account.delegate.is_none(),
            constraint = mint_holding_account.close_authority.is_none(),
            constraint = mint_holding_account.is_native() == false,
            constraint = mint_holding_account.mint.key() == mint.key(),
            )
        ]
        pub mint_holding_account: Account<'info, TokenAccount>,
        pub mint: Account<'info, Mint>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>
    }

    /*

    Token Membership Type

    */
    #[derive(Accounts)]
    #[instruction(args: AddMemberArgs)]
    pub struct AddMemberWithToken<'info> {
        pub authority: Signer<'info>, 
        pub membership_key: UncheckedAccount<'info>, 
        #[
        account(
        constraint = membership_mint_token_account.owner == 
        *membership_key.owner,
        constraint = membership_mint_token_account.delegate.is_none(),
        constraint = membership_mint_token_account.close_authority.is_none(),
        constraint = membership_mint_token_account.mint == membership_mint.key(),
        )
        ]
        pub membership_mint_token_account: Account<'info, TokenAccount>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            has_one=authority,
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            mut,
            constraint = membership_mint.key() == fanout.membership_mint.unwrap().key(),
        )]
        pub membership_mint: Account<'info, Mint>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
        pub token_program: Program<'info, Token>,
    }

    #[derive(Accounts)]
    pub struct StakeTokenMenber<'info> {
        pub signer: Signer<'info>, 
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            space = 78,
            seeds = [b"fanout-membership", fanout.account.key().as_ref(), signer.key().as_ref()],
            bump = fanout.bump_seed,
            payer = signer
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        #[account(
            mut,
            constraint = fanout.membership_mint.is_some() && membership_mint.key() == fanout.membership_mint.unwrap().key(),
        )]
        pub membership_mint: Account<'info, Mint>,
        pub system_program: Program<'info, System>,
        pub token_program: Program<'info, Token>,
    }

    #[derive(Accounts)]
    pub struct StakeTokenMemberForMint<'info> {
        pub signer: Signer<'info>, 
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            mut,
            seeds = [b"fanout-config-mint", fanout.key().as_ref()],
            bump = fanout_for_mint.bump_seed
        )]
        pub fanout_for_mint: Account<'info, Fanout>,
        pub mint: Account<'info, Mint>,
    }

    /*

    Wallet membership type
    */

    #[derive(Accounts)]
    #[instruction(args: AddMemberArgs)]
    pub struct AddMemberWallet<'info> {
        pub authority: Signer<'info>, 
        pub account: UncheckedAccount<'info>, 
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            has_one=authority,
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            space = 78,
            seeds = [b"fanout-membership", fanout.account.key().as_ref(), account.key().as_ref()],
            bump = fanout.bump_seed,
            payer = authority
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
        pub token_program: Program<'info, Token>,
    }

    /*

    NFT membership type
    */

    #[derive(Accounts)]
    #[instruction(args: AddMemberArgs)]
    pub struct AddMemberWithNFT<'info> {
        pub authority: Signer<'info>, 
        pub account: UncheckedAccount<'info>, 
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.as_ref()],
            has_one=authority,
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            space = 78,
            seeds = [b"fanout-membership", fanout.account.as_ref(), mint.key().as_ref()],
            bump = fanout.bump_seed,
            payer = authority
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        pub mint: Account<'info, Mint>,
        pub metadata: Account<'info, >,
        #[account(address = mpl_token_metadata::id())]
        pub token_metadata_program: UncheckedAccount<'info>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
        pub token_program: Program<'info, Token>,
    }

    #[derive(Accounts)]
    pub struct DistributeWalletMember<'info> {
        pub membership_key: UncheckedAccount<'info>,
        #[account(
            mut,
            seeds = [b"fanout-membership", fanout.account.key().as_ref(), membership_key.key().as_ref()],
            constraint = membership_account.membership_key.is_some() && membership_account.membership_key.unwrap() == membership_account.key(),
            bump = membership_account.bump_seed,
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        pub holding_account: UncheckedAccount<'info>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
    }

    #[derive(Accounts)]
    #[instruction(args: DistributeMemberArgs)]
    pub struct DistributeNFTMember<'info> {
        pub member: UncheckedAccount<'info>,
        #[
        account(
        constraint = membership_mint_token_account.owner == *member.owner,
        constraint = membership_mint_token_account.delegate.is_none(),
        constraint = membership_mint_token_account.close_authority.is_none(),
        constraint = membership_mint_token_account.mint == membership_mint.key(),
        constraint = membership_mint_token_account.amount == 1,
        )]
        pub membership_mint_token_account: Account<'info, TokenAccount>,
        pub membership_mint: Account<'info, Mint>,
        #[account(
            mut,
            seeds = [b"fanout-membership", fanout.account.key().as_ref(), membership_mint.key().as_ref()],
            constraint = membership_account.membership_key == Some(membership_mint.key()),
            bump = membership_account.bump_seed,
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        pub holding_account: UncheckedAccount<'info>,
        pub fanout_mint: UncheckedAccount<'info>,
        pub fanout_mint_membership: UncheckedAccount<'info>,
        pub mint: Account<'info, Mint>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
        pub token_program: Program<'info, Token>,
    }

    #[derive(Accounts)]
    pub struct DistributeTokenMember<'info> {
        pub member: UncheckedAccount<'info>,
        #[
        account(
        constraint = membership_mint_token_account.owner == *member.owner,
        constraint = membership_mint_token_account.delegate.is_none(),
        constraint = membership_mint_token_account.close_authority.is_none(),
        constraint = membership_mint_token_account.mint == membership_mint.key(),
        constraint =membership_mint_token_account.amount > 0,
        )]
        pub membership_mint_token_account: Account<'info, TokenAccount>,
        pub membership_mint: Account<'info, Mint>,
        #[account(
            mut,
            seeds = [b"fanout-membership", fanout.account.key().as_ref(), membership_mint.key().as_ref()],
            bump = membership_account.bump_seed,
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            constraint = holding_account.key() == fanout.account.key(), 
            )
        ]
        pub holding_account: UncheckedAccount<'info>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
    }
