import {Account, Connection, Keypair, LAMPORTS_PER_SOL} from "@solana/web3.js";
import {NodeWallet} from "@project-serum/common"; //TODO remove this
import {Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {expect, use} from "chai";
import ChaiAsPromised from "chai-as-promised";
import {Fanout, FanoutClient, FanoutMembershipVoucher, FanoutMint, MembershipModel} from "@hydra/fanout";
import {createMasterEdition} from "./utils/metaplex";
import {DataV2} from "@metaplex-foundation/mpl-token-metadata";
import {airdrop, LOCALHOST} from "@metaplex-foundation/amman";
import {builtNFTFanout} from "./utils/scenarios";

use(ChaiAsPromised);

describe("fanout", async () => {
    const connection = new Connection(LOCALHOST, "confirmed");
    let authorityWallet: Keypair;
    let fanoutSdk: FanoutClient;
    beforeEach(async () => {
        authorityWallet = Keypair.generate();
        await airdrop(connection, authorityWallet.publicKey, LAMPORTS_PER_SOL * 10);
        fanoutSdk = new FanoutClient(
            connection,
            new NodeWallet(new Account(authorityWallet.secretKey))
        );
        await airdrop(connection, authorityWallet.publicKey);
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
            const mint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
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

        it("Adds Members With NFT", async () => {
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
                authorityWallet,
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

        it("Distribute a Native Fanout with NFT Members", async () => {
            let builtFanout = await builtNFTFanout(fanoutSdk, 100, 5);
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
            const tx = await fanoutSdk.sendInstructions(
                [...distMember1.instructions, ...distMember2.instructions],
                [distBot],
                distBot.publicKey
            );
            if(!!tx.RpcResponseAndContext.value.err) {
                const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
                console.log(txdetails, tx.RpcResponseAndContext.value.err);
            }
            const memberDataAfter1 = await connection.getAccountInfo(member1.wallet.publicKey);
            const memberDataAfter2 = await connection.getAccountInfo(member2.wallet.publicKey);
            const holdingAccountAfter = await connection
                .getAccountInfo(builtFanout.fanoutAccountData.accountKey);
            const membershipAccount1 = await fanoutSdk.fetch<FanoutMembershipVoucher>(member1.voucher, FanoutMembershipVoucher);

            expect(memberDataAfter1?.lamports).to.equal(firstSnapshot * 0.2);
            expect(memberDataAfter2?.lamports).to.equal(firstSnapshot * 0.2);
            expect(holdingAccountAfter?.lamports)
                .to.equal(firstSnapshot - (firstSnapshot * 0.4) + holdingAccountReserved);
            expect(builtFanout.fanoutAccountData.lastSnapshotAmount.toString()).to.equal("0");
            expect(membershipAccount1.totalInflow.toString()).to.equal(`${firstSnapshot * 0.2}`);
            let distAgainMember1 = await fanoutSdk.distributeNftMemberInstructions(
                {
                    distributeForMint: false,
                    member: member1.wallet.publicKey,
                    membershipKey: member1.mint,
                    fanout: builtFanout.fanout,
                    payer: distBot.publicKey,
                },
            );
            const distAgainMember1Tx = await fanoutSdk.sendInstructions(
                [...distAgainMember1.instructions],
                [distBot],
                distBot.publicKey
            );
            await connection.getConfirmedTransaction(distAgainMember1Tx.TransactionSignature);
            const memberDataAfterAgain1 = await connection.getAccountInfo(member1.wallet.publicKey);
            expect(memberDataAfterAgain1?.lamports).to.equal(firstSnapshot * 0.2);
            const membershipAccountAgain1 = await fanoutSdk.fetch<FanoutMembershipVoucher>(member1.voucher, FanoutMembershipVoucher);
            expect(membershipAccountAgain1.totalInflow.toString()).to.equal(`${firstSnapshot * 0.2}`);
            const sent2 = 10;

            await airdrop(connection, builtFanout.fanoutAccountData.accountKey, sent2);
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
            await fanoutSdk.sendInstructions(
                [...distFinalMember1.instructions],
                [distBot],
                distBot.publicKey
            );
            const memberDataAfterFinal1 = await connection.getAccountInfo(member1.wallet.publicKey);
            // @ts-ignore
            expect(memberDataAfterFinal1?.lamports).to.equal(memberDataAfter1?.lamports + secondInflow * 0.2);
            const membershipAccountFinal1 = await fanoutSdk.fetch<FanoutMembershipVoucher>(member1.voucher, FanoutMembershipVoucher);
            // @ts-ignore
            expect(membershipAccountFinal1?.totalInflow.toString()).to.equal(`${memberDataAfter1?.lamports + secondInflow * 0.2}`);
        });

        it("Distributes a Fanout under a certain mint for NFT Members", async () => {
            let builtFanout = await builtNFTFanout(fanoutSdk, 100, 5);
            const mint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const {fanoutForMint, tokenAccount} =
                await fanoutSdk.initializeFanoutForMint({
                    fanout: builtFanout.fanout,
                    mint: mint.publicKey,
                });
            const fanoutForMintAccountData = await fanoutSdk.fetch<FanoutMint>(fanoutForMint, FanoutMint);

            const distBot = new Keypair();
            await airdrop(connection, distBot.publicKey, 1);
            const sent = 112;
            await mint.mintTo(fanoutForMintAccountData.tokenAccount, authorityWallet, [], sent)
            let member1 = builtFanout.members[0];
            let member2 = builtFanout.members[1];
            let distMember1 = await fanoutSdk.distributeNftMemberInstructions(
                {
                    distributeForMint: true,
                    member: member1.wallet.publicKey,
                    membershipKey: member1.mint,
                    fanout: builtFanout.fanout,
                    payer: distBot.publicKey,
                    fanoutMint: mint.publicKey
                },
            );
            let distMember2 = await fanoutSdk.distributeNftMemberInstructions(
                {
                    distributeForMint: false,
                    member: member2.wallet.publicKey,
                    membershipKey: member2.mint,
                    fanout: builtFanout.fanout,
                    payer: distBot.publicKey,
                    fanoutMint: mint.publicKey
                },
            );

            const tx = await fanoutSdk.sendInstructions(
                [...distMember1.instructions, ...distMember2.instructions],
                [distBot],
                distBot.publicKey
            );

            const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
            console.log(txdetails, tx.RpcResponseAndContext.value.err);
        })
    });
});