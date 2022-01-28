import { PublicKey, Keypair, Connection, Account } from "@solana/web3.js";
import { NodeWallet } from "@project-serum/common"; //TODO remove this
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect, use } from "chai";
import ChaiAsPromised from "chai-as-promised";
import { Fanout, MembershipModel } from "@hydra/fanout";
import { FanoutAccountData, FanoutMintAccountData } from "@hydra/fanout";
import { createMasterEdition } from "./utils/metaplex";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import { airdrop, LOCALHOST } from "@metaplex-foundation/amman";
use(ChaiAsPromised);

describe("fanout", async () => {
  const connection = new Connection(LOCALHOST, "singleGossip");
  let wallet;
  let fanoutSdk;
  beforeEach(async () => {
    console.log("Creating wallet");
    wallet = Keypair.generate();
    fanoutSdk = new Fanout(
        connection,
        new NodeWallet(new Account(wallet.secretKey))
    );
    await airdrop(connection, wallet.publicKey);
  });

  describe("NFT membership model", () => {

    it("Init", async () => {
      const { fanout } = await fanoutSdk.initializeFanout({
        totalShares: 100,
        name: `Test${Date.now()}`,
        membershipModel: MembershipModel.NFT,
      });

      const fanoutAccount = await fanoutSdk.fetch<FanoutAccountData>(
        fanout,
        FanoutAccountData
      );
      expect(MembershipModel[fanoutAccount.membershipModel]).to.equal(
        MembershipModel.NFT
      );
      expect(fanoutAccount.lastSnapshotAmount.toString()).to.equal("0");
      expect(fanoutAccount.totalMembers).to.equal(0);
      expect(fanoutAccount.totalInflow.toString()).to.equal("0");
      expect(fanoutAccount.totalAvailableShares.toString()).to.equal("100");
      expect(fanoutAccount.totalShares.toString()).to.equal("100");
      expect(fanoutAccount.membershipMint).to.equal(null);
      expect(fanoutAccount.totalStakedShares).to.equal(null);
    });

    it("Init For mint", async () => {
      const { fanout } = await fanoutSdk.initializeFanout({
        totalShares: 100,
        name: `Test${Date.now()}`,
        membershipModel: MembershipModel.NFT,
      });
      const fanoutAccount = await fanoutSdk.fetch<FanoutAccountData>(
        fanout,
        FanoutAccountData
      );

      const mint = await Token.createMint(
        connection,
        wallet,
        wallet.publicKey,
        null,
        6,
        TOKEN_PROGRAM_ID
      );

      const { fanoutForMint, tokenAccount } =
        await fanoutSdk.initializeFanoutForMint({
          fanout,
          fanoutNativeAccount: fanoutAccount.account,
          mint: mint.publicKey,
        });

      const fanoutMintAccount = await fanoutSdk.fetch<FanoutMintAccountData>(
        fanoutForMint,
        FanoutMintAccountData
      );

      expect(fanoutMintAccount.mint.toBase58()).to.equal(
        mint.publicKey.toBase58()
      );
      expect(fanoutMintAccount.fanout.toBase58()).to.equal(fanout.toBase58());
      expect(fanoutMintAccount.tokenAccount.toBase58()).to.equal(
        tokenAccount.toBase58()
      );
      expect(fanoutMintAccount.totalInflow.toString()).to.equal("0");
      expect(fanoutMintAccount.lastSnapshotAmount.toString()).to.equal("0");
    });

    it("Add Members With NFT", async () => {
      const { fanout } = await fanoutSdk.initializeFanout({
        totalShares: 100,
        name: `Test${Date.now()}`,
        membershipModel: MembershipModel.NFT,
      });
      const fanoutAccount = await fanoutSdk.fetch<FanoutAccountData>(
          fanout,
          FanoutAccountData
      );

      const initMetadataData = new DataV2({
        uri: "URI",
        name: "NAME",
        symbol: "SYMBOL",
        sellerFeeBasisPoints: 1000,
        creators: null,
        collection: null,
        uses: null,
      });
      return await createMasterEdition(
          connection,
          wallet,
          //@ts-ignore
          initMetadataData,
          0
      );
      //TODO create metadata
    });
  });
});

//   before(async () => {
//     mintToSplit = await createMint(provider, me, 0);
//     accountToSplit = await tokenUtils.createAtaAndMint(provider, mintToSplit, 0, splitWallet.publicKey);

//     sharesMint = mintOut;

//     fanout = fanoutOut;

//     await fanoutSdk.sendInstructions(instructions, [...signers, splitWallet], provider.wallet.publicKey);
//   })

//   it('Correctly initializes a fanout', async () => {
//     const fanoutAcct = await fanoutSdk.account.fanoutV0.fetch(fanout);
//     expect(fanoutAcct.account.toBase58()).to.equal(accountToSplit.toBase58());
//   });

//   describe("after staking", () => {
//     let voucher: PublicKey;
//     let destination: PublicKey;
//     let voucher2: PublicKey;
//     let destination2: PublicKey;
//     const secondShareHolder = Keypair.generate()
//     const unstakedShareHolder = Keypair.generate()

//     before(async () => {
//       // Send some shares to another shareholder
//       const shareholder2VoucherAccount = await tokenUtils.sendTokens(provider, sharesMint, secondShareHolder.publicKey, 20);
//       // Send some to someone not staked
//       await tokenUtils.sendTokens(provider, sharesMint, unstakedShareHolder.publicKey, 20);
//       const result = await fanoutSdk.stake({
//         fanout
//       });
//       voucher = result.voucher;
//       destination = result.destination;
//       const { instructions, output: result2, signers } = await fanoutSdk.stakeInstructions({
//         fanout,
//         sharesAccount: shareholder2VoucherAccount
//       });
//       await fanoutSdk.sendInstructions(instructions, [...signers, secondShareHolder], me);
//       voucher2 = result2.voucher;
//       destination2 = result2.destination;

//       await tokenUtils.mintTo(mintToSplit, 1000, accountToSplit);
//     })

//     it('creates the staking voucher', async () => {
//       const voucherAcct = await fanoutSdk.account.fanoutVoucherV0.fetch(voucher);
//       expect(voucherAcct.fanout.toBase58()).to.equal(fanout.toBase58())
//     })

//     it('gives us our share of the account', async () => {
//       await fanoutSdk.distribute({
//         voucher
//       });
//       await fanoutSdk.distribute({
//         voucher: voucher2
//       });
//       await tokenUtils.expectBalance(destination, 60 / 80 * 1000);
//       await tokenUtils.expectBalance(destination2, 20 / 80 * 1000);
//       await tokenUtils.mintTo(mintToSplit, 500, accountToSplit);
//       await fanoutSdk.distribute({
//         voucher
//       });
//       await tokenUtils.expectBalance(destination, 60 / 80 * 1000 + (60 / 80) * 500);
//       await tokenUtils.mintTo(mintToSplit, 250, accountToSplit);
//       await fanoutSdk.distribute({
//         voucher: voucher2
//       });
//       await tokenUtils.expectBalance(destination2, 20 / 80 * 1000 + Math.floor((20 / 80) * 750));
//     })
//   })
// });
