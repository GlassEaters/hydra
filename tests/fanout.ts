import { PublicKey, Keypair, Connection, Account ,LAMPORTS_PER_SOL} from "@solana/web3.js";
import { NodeWallet } from "@project-serum/common"; //TODO remove this
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect, use } from "chai";
import ChaiAsPromised from "chai-as-promised";
import { FanoutClient, Fanout, FanoutMint, FanoutMembershipVoucher, MembershipModel} from "@hydra/fanout";
import { createMasterEdition } from "./utils/metaplex";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import { airdrop, LOCALHOST } from "@metaplex-foundation/amman";
import {builtNFTFanout} from "./utils/scenarios";
import BN from "bn.js";
use(ChaiAsPromised);

describe("fanout", async () => {
  const connection = new Connection(LOCALHOST, "confirmed");
  let wallet: Keypair;
  let fanoutSdk: FanoutClient;
  beforeEach(async () => {
    wallet = Keypair.generate();
    fanoutSdk = new FanoutClient(
        connection,
        new NodeWallet(new Account(wallet.secretKey))
    );
    await airdrop(connection, wallet.publicKey);
  });

  describe("NFT membership model", () => {

    it("Init", async () => {
      const {fanout} = await fanoutSdk.initializeFanout({
        totalShares: 100,
        name: `Test${Date.now()}`,
        membershipModel: MembershipModel.NFT,
      });

      const fanoutAccount = await fanoutSdk.fetch<Fanout>(
          fanout,
          Fanout
      );
      expect(fanoutAccount.membershipModel).to.equal(
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
      const {fanout} = await fanoutSdk.initializeFanout({
        totalShares: 100,
        name: `Test${Date.now()}`,
        membershipModel: MembershipModel.NFT,
      });
      const fanoutAccount = await fanoutSdk.fetch<Fanout>(
          fanout,
          Fanout
      );

      const mint = await Token.createMint(
          connection,
          wallet,
          wallet.publicKey,
          null,
          6,
          TOKEN_PROGRAM_ID
      );

      const {fanoutForMint, tokenAccount} =
          await fanoutSdk.initializeFanoutForMint({
            fanout,
            mint: mint.publicKey,
          });

      const fanoutMintAccount = await fanoutSdk.fetch<FanoutMint>(
          fanoutForMint,
          FanoutMint
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
      const init = await fanoutSdk.initializeFanout({
        totalShares: 100,
        name: `Test${Date.now()}`,
        membershipModel: MembershipModel.NFT,
      });
      const initMetadataData = new DataV2({
        uri: "URI",
        name: "NAME",
        symbol: "SYMBOL",
        sellerFeeBasisPoints: 1000,
        creators: null,
        collection: null,
        uses: null,
      });
      const nft = await createMasterEdition(
          connection,
          wallet,
          //@ts-ignore
          initMetadataData,
          0
      );
      const {membershipAccount} = await fanoutSdk.addMemberNft({
        fanout: init.fanout,
        fanoutNativeAccount: init.nativeAccount,
        mint: nft.mint.publicKey,
        shares: 10
      });
      const fanoutAccount = await fanoutSdk.fetch<Fanout>(
          init.fanout,
          Fanout
      );
      const membershipAccountData = await fanoutSdk.fetch<FanoutMembershipVoucher>(
          membershipAccount,
          FanoutMembershipVoucher
      );
      expect(fanoutAccount.membershipModel).to.equal(
          MembershipModel.NFT
      );
      expect(fanoutAccount.lastSnapshotAmount.toString()).to.equal("0");
      expect(fanoutAccount.totalMembers).to.equal(1);
      expect(fanoutAccount.totalInflow.toString()).to.equal("0");
      expect(fanoutAccount.totalAvailableShares.toString()).to.equal("90");
      expect(fanoutAccount.totalShares.toString()).to.equal("100");
      expect(fanoutAccount.membershipMint).to.equal(null);
      expect(fanoutAccount.totalStakedShares).to.equal(null);
      expect(membershipAccountData?.shares?.toString()).to.equal("10");
      expect(membershipAccountData?.membershipKey?.toBase58()).to.equal(nft.mint.publicKey.toBase58());
    });

    it("Distribute Native NFT", async () => {
      let builtFanout = await builtNFTFanout(fanoutSdk, 100, 5);
      const fanoutAccount = await fanoutSdk.fetch<Fanout>(
          builtFanout.fanout,
          Fanout
      );
      const [membershipAccount, voucherBumpSeed] =
          await FanoutClient.membershipVoucher(builtFanout.fanout, builtFanout.members[0].mint);
      expect(builtFanout.fanoutAccountData.totalAvailableShares.toString()).to.equal("0");
      expect(builtFanout.fanoutAccountData.totalMembers.toString()).to.equal("5");
      expect(builtFanout.fanoutAccountData.lastSnapshotAmount.toString()).to.equal("0");
      const distBot = new Keypair();
      const sent = 10;
      await airdrop(connection, builtFanout.fanoutAccountData.accountKey, sent);
      await airdrop(connection, distBot.publicKey, 1);

      let member1 = builtFanout.members[0];
      let member2 = builtFanout.members[1];
      let distMember1 = await fanoutSdk.distributeNftMemberInstructions(
          {
            distributeForMint: false,
            member: member1.wallet.publicKey,
            membershipKey: member1.mint,
            fanout: builtFanout.fanout,
            payer: distBot.publicKey,
          },
      );
      let distMember2 = await fanoutSdk.distributeNftMemberInstructions(
          {
            distributeForMint: false,
            member: member2.wallet.publicKey,
            membershipKey: member2.mint,
            fanout: builtFanout.fanout,
            payer: distBot.publicKey,
          },
      );
      const holdingAccountReserved = await connection.getMinimumBalanceForRentExemption(1);
      const memberDataBefore1 = await connection.getAccountInfo(member1.wallet.publicKey);
      const memberDataBefore2 = await connection.getAccountInfo(member2.wallet.publicKey);
      const holdingAccountBefore = await connection
          .getAccountInfo(builtFanout.fanoutAccountData.accountKey);
      expect(memberDataBefore2).to.be.null;
      expect(memberDataBefore1).to.be.null;
      const firstSnapshot = sent * LAMPORTS_PER_SOL;
      expect(holdingAccountBefore?.lamports).to.equal(firstSnapshot + holdingAccountReserved);
      const tx  = await fanoutSdk.sendInstructions(
          [...distMember1.instructions, ...distMember2.instructions],
          [distBot],
          distBot.publicKey
      );

      const memberDataAfter1 = await connection.getAccountInfo(member1.wallet.publicKey);
      const memberDataAfter2 = await connection.getAccountInfo(member2.wallet.publicKey);
      const holdingAccountAfter = await connection
          .getAccountInfo(builtFanout.fanoutAccountData.accountKey);
      const membershipAccount1 = await fanoutSdk.fetch<FanoutMembershipVoucher>(member1.voucher, FanoutMembershipVoucher);
      console.log(membershipAccount1)
      expect(memberDataAfter1?.lamports).to.equal( firstSnapshot * 0.2);
      expect(memberDataAfter2?.lamports).to.equal( firstSnapshot * 0.2);
      expect(holdingAccountAfter?.lamports)
          .to.equal( firstSnapshot - (firstSnapshot * 0.4) + holdingAccountReserved);
      expect(builtFanout.fanoutAccountData.lastSnapshotAmount.toString()).to.equal("0");
      expect(membershipAccount1.totalInflow.toString()).to.equal(`${firstSnapshot * 0.2}`);
      let latestBalance = holdingAccountAfter?.lamports;
      let distAgainMember1 = await fanoutSdk.distributeNftMemberInstructions(
          {
            distributeForMint: false,
            member: member1.wallet.publicKey,
            membershipKey: member1.mint,
            fanout: builtFanout.fanout,
            payer: distBot.publicKey,
          },
      );
      const distAgainMember1Tx  = await fanoutSdk.sendInstructions(
          [...distAgainMember1.instructions],
          [distBot],
          distBot.publicKey
      );
      await connection.getConfirmedTransaction(distAgainMember1Tx.TransactionSignature);
      const memberDataAfterAgain1 = await connection.getAccountInfo(member1.wallet.publicKey);
      expect(memberDataAfterAgain1?.lamports).to.equal( firstSnapshot * 0.2);
      const membershipAccountAgain1 = await fanoutSdk.fetch<FanoutMembershipVoucher>(member1.voucher, FanoutMembershipVoucher);
      expect(membershipAccountAgain1.totalInflow.toString()).to.equal(`${firstSnapshot * 0.2}`);
      const sent2 = 10;

      await airdrop(connection, builtFanout.fanoutAccountData.accountKey, sent2);
      const holdingAccountFinal = await connection
          .getAccountInfo(builtFanout.fanoutAccountData.accountKey);
      const secondInflow = (sent2 * LAMPORTS_PER_SOL);
      let distFinalMember1 = await fanoutSdk.distributeNftMemberInstructions(
          {
            distributeForMint: false,
            member: member1.wallet.publicKey,
            membershipKey: member1.mint,
            fanout: builtFanout.fanout,
            payer: distBot.publicKey,
          },
      );
      const distFinalMember1Tx  = await fanoutSdk.sendInstructions(
          [...distFinalMember1.instructions],
          [distBot],
          distBot.publicKey
      );
      const txdetails = await connection.getConfirmedTransaction(distFinalMember1Tx.TransactionSignature);
      const memberDataAfterFinal1 = await connection.getAccountInfo(member1.wallet.publicKey);
      expect(memberDataAfterFinal1?.lamports).to.equal( memberDataAfter1?.lamports+secondInflow * 0.2);
      const membershipAccountFinal1 = await fanoutSdk.fetch<FanoutMembershipVoucher>(member1.voucher, FanoutMembershipVoucher);
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
