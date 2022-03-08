---
sidebar_position: 1
---

# What is Hydra

Hydra is a wallet of wallets. A fanout wallet if you will. It allows the creation of extremely large membership sets that can take part in fund distribution from a central wallet. It works with SOL and any SPL token.
![](/img/fanout.jpg)

## Basic flow

There are three steps in the lifecycle of a Hydra Wallet:

1. Creation - Create the Wallet
2. Addition - Add Members
3. Distribution - Distribute funds to the Members according to their share

The Distribution step is an on-chain operation that's called on a per-Member basis. We'll get into all the details of this later, but Hydra will track all distribtuions and ensure that Members only get their share of the funds. As new funds flow into the Hydra Wallet, members (or other automated processes) will call the Distribution operation to disburse the appropriate share of funds to the given Member. 

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

### Creating a Wallet that can also accept SPL Tokens

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

    For example, if you mint a supply of 1000 tokens and distrubte all 1000, but only 40 of them are staked, then distributions will be calculated off of the 40 that are staked, not the 1000 total supply. Members who do not stake get 0% and those that do get `staked / 40` of the distribution. 

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

Now the fun part, claiming your share! 

TODO: Add a detailed description of the distribution process.