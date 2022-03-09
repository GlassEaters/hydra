---
sidebar_position: 1
---

# What is Hydra

Hydra is a wallet of wallets, a fanout wallet if you will. It enables extremely large membership sets that can take part in fund distribution from a central wallet. It works with SOL and any SPL token.
![](/img/fanout.jpg)

## Basic Flow

A Hydra Wallet's lifecycle has 3 phases:

1. Creation - Create the Wallet
2. Member Addition - Add Members and specify their share
3. Distribution - Distribute funds to the Members according to their share

The Distribution phase is an on-chain operation that's called on a per-Member basis. We'll get into all the details of this later, but Hydra will track all distributions and ensure that Members always get their fair share of the funds. As new funds flow into the Hydra Wallet, members (or other automated processes) will call the Distribution operation to disburse the appropriate share of funds to the given Member. 

Let's get into a bit more detail on these steps.

## Creating a Wallet

The creator of the Hydra Wallet is known as the **Authority**. The Authority will specify the globally unique name of the wallet, the total number of shares to be distributed, and the Membership Model (which we'll cover in a moment). We've provided our own `FanoutClient` with the SDK, which you'll initialize with the Authority's Wallet. You'll need about XXX Sol to create the Hydra Wallet.

```ts
const connection = new Connection("devnet", "confirmed");
let fanoutSdk: FanoutClient;

authorityWallet = Keypair.generate();

fanoutSdk = new FanoutClient(
            connection,
            new NodeWallet(new Account(authorityWallet.secretKey))
        );

const init = await fanoutSdk.initializeFanout({
                totalShares: 100,
                name: `Test${Date.now()}`,
                membershipModel: MembershipModel.Wallet,
            });
```

### Also accept SPL Tokens

If you want to also accept other specific SPL Tokens, you can update your Hydra Wallet to accept those by specifying the given token's public key after initializing the wallet. 

```ts
const mintPublicKey = "SPL-Token-Public-Key";

const {fanoutForMint, tokenAccount} =
    await fanoutSdk.initializeFanoutForMint({
        fanout,
        mint: mint.publicKey,
    });
```



## Adding Members

There are three different Membership Models shipping with this first version of Hydra:

1. **Wallet** - This is the simplest membership model. It's just a list of each Member's public address and the number of shares they own. The sum of all Member's shares must equal the `totalShares` specified in the `initializeFanout` call.

```ts
const member = new Keypair();

const {membershipAccount} = await fanoutSdk.addMemberWallet({
    fanout: init.fanout,
    fanoutNativeAccount: init.nativeAccount,
    membershipKey: member.publicKey,
    shares: 10
});

// Add members until sum of shares = totalShares
...
```

2. **NFT** - With this model membership is tied to an NFT mint address instead of static public address. Each NFT mint address can still have a different quantity of shares as in the Wallet model. The greatest benefit of this model is it effectively enables the simple transfer of rights to future distributions to any wallet owner that holds the given NFT. 

```ts

const nftMintPublicKey = "nftMintPublicKey";

const init = await fanoutSdk.initializeFanout({
    totalShares: 100,
    name: `Test${Date.now()}`,
    membershipModel: MembershipModel.NFT,
});

const {membershipAccount} = await fanoutSdk.addMemberNft({
    fanout: init.fanout,
    fanoutNativeAccount: init.nativeAccount,
    membershipKey: nftMintPublicKey,
    shares: 10
});

// Add members until sum of shares = totalShares
...
```

3. **Token** - This is the most flexible membership model, but is a bit more complicated. In this model, Membership is associated with staked ownership of the specified Token. When creating a Hydra Wallet with the Token model, you specify the mint of an SPL Token and distribute those tokens to your members (in whatever proportion you want). Then those members need to stake their tokens with the Hydra Wallet to be able to claim their share of the distribution. 

    For example, if you mint a supply of 1000 tokens and distribute all 1000, but only 40 of them are staked, then distributions will be calculated off of the 40 that are staked, not the 1000 total supply. Members who do not stake get 0% and those that do get `staked / 40` of the distribution. 

    We are aware of some initialization issues with this model, so for now we recommend you don't fund the Hydra Wallet until you've given your members enough time to stake their tokens.

```ts
const membershipMintPublicKey = "SPL-TokenPublicKey";

const {fanout} = await fanoutSdk.initializeFanout({
    totalShares: 0,
    name: `Test${Date.now()}`,
    membershipModel: MembershipModel.Token,
    mint: membershipMintPublicKey
});

// Staking tokens

const ixs = await fanoutSdk.stakeTokenMemberInstructions(
    {
        shares: supply * .1,
        fanout: fanout,
        membershipMintTokenAccount: tokenAcctMember,
        membershipMint: membershipMint.publicKey,
        member: member.publicKey,
        payer: member.publicKey
    }
);
const tx = await fanoutSdk.sendInstructions(
    ixs.instructions,
    [member],
    member.publicKey
);
if (!!tx.RpcResponseAndContext.value.err) {
    const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
    console.log(txdetails, tx.RpcResponseAndContext.value.err);
}

const stake = await membershipMint.getAccountInfo(ixs.output.stakeAccount);
```

## Distributing Funds

The Distribute method is expected to be called many times over the lifetime of a Hydra Wallet. In order to keep the processing and memory costs under Solana limits while enabling arbitrarily large membership sets, we require that you specify the Member (and if applicable the Member's NFT or SPL mint) that you want to distribute funds to.

:::caution
Distribution will fail if the sum of member shares does not equal the totalShares specified in the `initializeFanout` call.
:::

Hydra will track distribution so you can call this multiple times and funds will only be distributed to the Member once. The Distribute method is slightly different depending on the Membership Model:

### Wallet
```ts
const member1.publicKey = "Member1.publicKey";
const distributionBot = new Keypair(); 
// This is the caller of the Distribute method, it can be a bot or a user, 
// they just need enough funds to pay for the transaction fee. If you're using 
// this code, airdrop a sol to distributionBot.

let distributeToMember1 = await fanoutSdk.distributeWalletMemberInstructions(
    {
        distributeForMint: false,
        member: member1.publicKey,
        fanout: fanout, // From initialization
        payer: distributionBot.publicKey,
    },
);

const tx = await fanoutSdk.sendInstructions(
    [...distMember1.instructions],
    [distributionBot],
    distributionBot.publicKey
);
if (!!tx.RpcResponseAndContext.value.err) {
    const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
    console.log(txdetails, tx.RpcResponseAndContext.value.err);
}
```

### NFT
Same as above, but replace distributeToMember1 with this:
```ts
const member1.mint = "NFT Mint for Member 1";

let distributeToMember1 = await fanoutSdk.distributeNftMemberInstructions(
    {
        distributeForMint: false,
        member: member1.publicKey,
        membershipKey: member1.mint,
        fanout: fanout,
        payer: distributionBot.publicKey,
    },
);
```

### Token

Same as Wallet, but replace distributeToMember1 with this:
```ts
const membershiptMint.publicKey = "SPL-Token-PublicKey";

let distributeToMember1 = await fanoutSdk.distributeTokenMemberInstructions(
    {
        distributeForMint: false,
        membershipMint: membershipMint.publicKey,
        fanout: fanout,
        member: member1.publicKey,
        payer: distributionBot.publicKey,
    }
);
```

### Distribute SPL Tokens

The process is basically the same, you'll additionally specify the Mint of the Token you want to distribute and set distributeForMint to true.

Example for the Wallet member model:
```ts
const mint.publicKey = "SPL-Token-To-Distribute-PublicKey";

let distributeToMember1 = await fanoutSdk.distributeWalletMemberInstructions(
    {
        distributeForMint: true,
        member: member1.publicKey,
        fanout: builtFanout.fanout,
        payer: distributionBot.publicKey,
        fanoutMint: mint.publicKey
    },
);

```

## Additional Capabilities

One key use case for Hydra is specifying the Hydra Wallet as a creator with some royalty share for an NFT. We've enabled the Authority of the Hydra Wallet to sign NFTs as the Hydra Wallet so the wallet is a verified creator in the NFT metadata.

```ts
import {
   CreateMasterEditionV3,
   CreateMetadataV2,
   Creator,
   DataV2,
   MasterEdition,
   MAX_NAME_LENGTH,
   Metadata, SignMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

// ...

const connection = new Connection("devnet", "confirmed");
let fanoutSdk: FanoutClient;

authorityWallet = Keypair.generate();

fanoutSdk = new FanoutClient(
        connection,
        new NodeWallet(new Account(authorityWallet.secretKey))
);

const init = await fanoutSdk.initializeFanout({
   totalShares: 100,
   name: `Test${Date.now()}`,
   membershipModel: MembershipModel.Wallet,
});

// Set Royalties
const allCreators = [{creator: authorityWallet.publicKey, share: 0}, {
   creator: init.output.fanout,
   publicKey,
   share: 100
}];

// CREATE NFT  (quick and dirty) better jssdk coming soon(TM)
const data = new DataV2({
   collection: undefined,
   uses: undefined,
   name: name,
   symbol: "",
   uri: `https://arweave.net/${metadataLink}`,
   sellerFeeBasisPoints,
   creators: allCreators.map((c) => {
      return new Creator({
         address: c.creator,
         verified: c.creator === wallet.publicKey.toBase58(),
         share: Number(c.share),
      });
   }),
});
const mint = Keypair.generate();
const metadataAccount = await Metadata.getPDA(mint.publicKey);
const editionAccount = await MasterEdition.getPDA(mint.publicKey);
const userTokenAccountAddress = await Token.getAssociatedTokenAddress(
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        walletKey,
        true,
);
const instructions: TransactionInstruction[] = [];
instructions.push(
        SystemProgram.createAccount({
           fromPubkey: walletKey,
           newAccountPubkey: mint.publicKey,
           lamports: cost,
           space: MintLayout.span,
           programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
                TOKEN_PROGRAM_ID,
                mint.publicKey,
                0,
                walletKey,
                walletKey,
        ),
        SystemProgram.transfer({
           fromPubkey: walletKey,
           toPubkey: donationAddress,
           lamports: DONATION,
        }),
        Token.createAssociatedTokenAccountInstruction(
                SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                mint.publicKey,
                userTokenAccountAddress,
                walletKey,
                walletKey,
        ),
        ...new CreateMetadataV2(
                {
                   feePayer: walletKey,
                },
                {
                   metadata: metadataAccount,
                   metadataData,
                   updateAuthority: walletKey,
                   mint: mint.publicKey,
                   mintAuthority: walletKey,
                },
        ).instructions,
        Token.createMintToInstruction(
                TOKEN_PROGRAM_ID,
                mint.publicKey,
                userTokenAccountAddress,
                walletKey,
                [],
                1,
        ),
        ...new CreateMasterEditionV3(
                {
                   feePayer: walletKey,
                },
                {
                   edition: editionAccount,
                   metadata: metadataAccount,
                   updateAuthority: walletKey,
                   mint: mint.publicKey,
                   mintAuthority: walletKey,
                   maxSupply,
                },
        ).instructions,
        ...new SignMetadata(
                {
                   feePayer: walletKey,
                },
                // SIGN THE METADATA
                {
                   creator: init.output.fanout,
                   metadata: metadataAccount
                },
        ).instructions,
        
);
```

## Future Plans

We're very excited about the use cases the Hydra Wallet unlocks and we're looking forward to seeing it out on mainnet. We have a few additional membership models that we're considering implementing, so let us know if you're interested or if you have a use case that you think we should be addressing.

Additional Models:
1. NFT Collection - This is similar to the NFT model, but it would be easier to initialize (just use the collection address) and you could automatically weigh the wallet share by NFT properties instead of specifying on a per-NFT basis.
2. Merkle or RSA Accumulator, some poi shizzle - ???


## DOC TODO
1. Can I query membership in an existing fanout using the fanout address?
2. For the Wallet and NFT models, can I update the membership share for a given address?