    use anchor_lang::{
        prelude::*,
        solana_program::program::{invoke, invoke_signed},
    };
    use anchor_spl::{
        associated_token,
        token::{Mint, Token, TokenAccount},
    };

    use crate::arg::*;
    use crate::error::ErrorCode;
    use crate::state::*;

    #[derive(Accounts)]
    #[instruction(args: InitializeFanoutArgs)]
    pub struct InitializeFanout<'info> {
        pub authority: Signer<'info>,
        #[account(
            init,
            space = 300,
            seeds = [b"fanout-config", holding_account.key().as_ref()],
            bump = args.bump_seed,
            payer = authority
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            space = 1,
            seeds = [b"fanout-native-account", holding_account.key().as_ref()],
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
    #[instruction(args: InitializeFanoutArgs)]
    pub struct InitializeFanoutForMint<'info> {
        pub authority: Signer<'info>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            has_one=authority,
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            payer=authority,
            space = 200,
            seeds = [b"fanout-config", fanout.key().as_ref(), mint.key().as_ref()],
            bump = args.bump_seed
        )]
        pub fanout_for_mint: Account<'info, Fanout>,
        #[account(
            init,
            space = 1,
            payer = authority,
            constraint = mint_holding_account.owner ==
            Pubkey::create_program_address(&[b"account-owner", fanout.key().as_ref(), &[args.account_owner_bump_seed]], &crate::id())?, // must assign ownership first
            constraint = mint_holding_account.delegate.is_none(),
            constraint = mint_holding_account.close_authority.is_none(),
            constraint = mint_holding_account.is_native() == true,
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
            constraint = membership_mint.key() == fanout.membership_mint.unwrap().key(),
        )]
        pub membership_mint: Account<'info, Mint>,
    }

    #[derive(Accounts)]
    pub struct StakeTokenMenberForMint<'info> {
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
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            has_one=authority,
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(
            init,
            space = 78,
            seeds = [b"fanout-membership", fanout.account.key().as_ref(), mint.key().as_ref()],
            bump = fanout.bump_seed,
            payer = authority
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        pub mint: Account<'info, Mint>,
        #[
        account(
        constraint = token_account.owner == account.key(),
        constraint = token_account.delegate.is_none(),
        constraint = token_account.close_authority.is_none(),
        constraint = token_account.mint == mint.key(),
        )
        ]
        pub token_account: Account<'info, TokenAccount>, //User must have a token account for the mint, but it can be empty
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
            has_one = membership_key,
            bump = membership_account.bump_seed,
        )]
        pub membership_account: Account<'info, FanoutMembershipVoucher>,
        #[account(
            mut,
            seeds = [b"fanout-config", fanout.account.key().as_ref()],
            bump = fanout.bump_seed,
        )]
        pub fanout: Account<'info, Fanout>,
        #[account(constraint = holding_account.key() == fanout.account.key())]
        pub holding_account: UncheckedAccount<'info>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
    }

    #[derive(Accounts)]
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
        #[account(
            constraint = holding_account.key() == fanout.account.key(), 
            )
        ]
        pub holding_account: UncheckedAccount<'info>,
        pub system_program: Program<'info, System>,
        pub rent: Sysvar<'info, Rent>,
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

    // #[derive(Accounts)]
    // pub struct DistributeMemberForMint<'info> {
    //     pub membership_key: UncheckedAccount<'info>, 
    //     #[account(
    //         mut,
    //         seeds = [b"fanout-membership", fanout.account.key().as_ref(), membership_key.key().as_ref()],
    //         bump = fanout.bump_seed,
    //         has_one = membership_key
    //     )]
    //     pub membership_account: Account<'info, FanoutMembershipVoucher>,
    //     #[account(
    //         mut,
    //         seeds = [b"fanout-config", fanout.account.key().as_ref()],
    //         bump = fanout.bump_seed,
    //     )]
    //     pub fanout: Account<'info, Fanout>,
    //     #[account(
    //         mut,
    //         seeds = [b"fanout-config-mint", fanout.key().as_ref()],
    //         bump = fanout_for_mint.bump_seed
    //     )]
    //     pub fanout_for_mint: Account<'info, Fanout>,
    //     #[account(
    //         constraint = holding_account.key() == fanout.account.key(), 
    //         )
    //     ]
    //     pub holding_account: UncheckedAccount<'info>,
    //     pub system_program: Program<'info, System>,
    //     pub rent: Sysvar<'info, Rent>,
    // }
