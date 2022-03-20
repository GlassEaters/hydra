import {Account, Connection, Keypair, LAMPORTS_PER_SOL} from "@solana/web3.js";
import {NodeWallet} from "@project-serum/common"; //TODO remove this
import {Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {expect, use} from "chai";
import ChaiAsPromised from "chai-as-promised";
import {Fanout, FanoutClient, FanoutMembershipVoucher, FanoutMint, MembershipModel} from "../packages/sdk/src";
import {airdrop, LOCALHOST} from "@metaplex-foundation/amman";
import {builtTokenFanout} from "./utils/scenarios";
import BN from "bn.js";

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

    describe("Token membership model", () => {


        it("Authority Stakes Members", async () => {
            const membershipMint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const supply = 1000000 * (10 ** 6);
            const member = new Keypair();
            await airdrop(connection, member.publicKey, 1);
            const tokenAcct = await membershipMint.createAccount(authorityWallet.publicKey)
            await membershipMint.mintTo(tokenAcct, authorityWallet.publicKey, [], supply);
            
            const {fanout} = await fanoutSdk.initializeFanout({
                totalShares: 0,
                name: `Test${Date.now()}`,
                membershipModel: MembershipModel.Token,
                mint: membershipMint.publicKey
            });
            const ixs = await fanoutSdk.stakeTokenMemberInstructionsByAuthority(
                {
                    authority: authorityWallet,
                    shares: supply * .1,
                    fanout: fanout,
                    membershipMintTokenAccount: tokenAcct,
                    membershipMint: membershipMint.publicKey,
                    member: member.publicKey,
                    payer: authorityWallet.publicKey
                }
            );
            const tx = await fanoutSdk.sendInstructions(
                ixs.instructions,
                [authorityWallet],
                authorityWallet.publicKey
            );
            if (!!tx.RpcResponseAndContext.value.err) {
                const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
                console.log(txdetails, tx.RpcResponseAndContext.value.err);
            }
            const voucher = await fanoutSdk.fetch<FanoutMembershipVoucher>(ixs.output.membershipVoucher, FanoutMembershipVoucher);

            expect(voucher.shares?.toString()).to.equal(`${supply * .1}`);
            expect(voucher.membershipKey?.toBase58()).to.equal(member.publicKey.toBase58());
            expect(voucher.fanout?.toBase58()).to.equal(fanout.toBase58());
            const stake = await membershipMint.getAccountInfo(ixs.output.stakeAccount);
            expect(stake.amount.toString()).to.equal(`${supply * .1}`);
            const fanoutAccountData = await fanoutSdk.fetch<Fanout>(
                fanout,
                Fanout
            );
            expect(fanoutAccountData.totalShares?.toString()).to.equal(`${supply}`);
            expect(fanoutAccountData.totalStakedShares?.toString()).to.equal(`${supply * .1}`);
        });

        /*
        it("Init", async () => {

            const membershipMint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const supply = 1000000 * (10 ** 6);
            const tokenAcct = await membershipMint.createAccount(authorityWallet.publicKey)
            await membershipMint.mintTo(tokenAcct, authorityWallet.publicKey, [], supply);
            const {fanout} = await fanoutSdk.initializeFanout({
                totalShares: 0,
                name: `Test${Date.now()}`,
                membershipModel: MembershipModel.Token,
                mint: membershipMint.publicKey
            });

            const fanoutAccount = await fanoutSdk.fetch<Fanout>(
                fanout,
                Fanout
            );
            expect(fanoutAccount.membershipModel).to.equal(
                MembershipModel.Token
            );
            expect(fanoutAccount.lastSnapshotAmount.toString()).to.equal("0");
            expect(fanoutAccount.totalMembers.toString()).to.equal("0");
            expect(fanoutAccount.totalInflow.toString()).to.equal("0");
            expect(fanoutAccount.totalAvailableShares.toString()).to.equal("0");
            expect(fanoutAccount.totalShares.toString()).to.equal(supply.toString());
            expect(fanoutAccount.membershipMint?.toBase58()).to.equal(membershipMint.publicKey.toBase58());
            expect(fanoutAccount.totalStakedShares?.toString()).to.equal("0");
        });

        it("Init For mint", async () => {
            const membershipMint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const supply = 1000000 * (10 ** 6);
            const tokenAcct = await membershipMint.createAccount(authorityWallet.publicKey)
            await membershipMint.mintTo(tokenAcct, authorityWallet.publicKey, [], supply);
            const {fanout} = await fanoutSdk.initializeFanout({
                totalShares: 0,
                name: `Test${Date.now()}`,
                membershipModel: MembershipModel.Token,
                mint: membershipMint.publicKey
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

        it("Stakes Members", async () => {
            const membershipMint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const supply = 1000000 * (10 ** 6);
            const member = new Keypair();
            await airdrop(connection, member.publicKey, 1);
            const tokenAcct = await membershipMint.createAccount(authorityWallet.publicKey)
            const tokenAcctMember = await membershipMint.createAssociatedTokenAccount(member.publicKey)
            await membershipMint.mintTo(tokenAcct, authorityWallet.publicKey, [], supply);
            await membershipMint.transfer(tokenAcct, tokenAcctMember, authorityWallet.publicKey, [], supply * .1);

            const {fanout} = await fanoutSdk.initializeFanout({
                totalShares: 0,
                name: `Test${Date.now()}`,
                membershipModel: MembershipModel.Token,
                mint: membershipMint.publicKey
            });
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
            const voucher = await fanoutSdk.fetch<FanoutMembershipVoucher>(ixs.output.membershipVoucher, FanoutMembershipVoucher);

            expect(voucher.shares?.toString()).to.equal(`${supply * .1}`);
            expect(voucher.membershipKey?.toBase58()).to.equal(member.publicKey.toBase58());
            expect(voucher.fanout?.toBase58()).to.equal(fanout.toBase58());
            const stake = await membershipMint.getAccountInfo(ixs.output.stakeAccount);
            expect(stake.amount.toString()).to.equal(`${supply * .1}`);
            const fanoutAccountData = await fanoutSdk.fetch<Fanout>(
                fanout,
                Fanout
            );
            expect(fanoutAccountData.totalShares?.toString()).to.equal(`${supply}`);
            expect(fanoutAccountData.totalStakedShares?.toString()).to.equal(`${supply * .1}`);
        });
        it("Distribute a Native Fanout with Token Members", async () => {
            const membershipMint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const distBot = new Keypair();
            await airdrop(connection, distBot.publicKey, 1);
            let builtFanout = await builtTokenFanout(membershipMint, authorityWallet, fanoutSdk, 100, 5);
            expect(builtFanout.fanoutAccountData.totalAvailableShares.toString()).to.equal("0");
            expect(builtFanout.fanoutAccountData.totalMembers.toString()).to.equal("5");
            expect(builtFanout.fanoutAccountData.totalShares?.toString()).to.equal(`${100 ** 6}`);
            expect(builtFanout.fanoutAccountData.totalStakedShares?.toString()).to.equal(`${100 ** 6}`);
            expect(builtFanout.fanoutAccountData.lastSnapshotAmount.toString()).to.equal("0");
            const sent = 10;
            await airdrop(connection, builtFanout.fanoutAccountData.accountKey, sent);
            const firstSnapshot = sent * LAMPORTS_PER_SOL;
            const firstMemberAmount = firstSnapshot * 0.2
            let member1 = builtFanout.members[0];
            let ix = await fanoutSdk.distributeTokenMemberInstructions(
                {
                    distributeForMint: false,
                    membershipMint: membershipMint.publicKey,
                    fanout: builtFanout.fanout,
                    member: member1.wallet.publicKey,
                    payer: distBot.publicKey

                }
            );
            const memberBefore = await fanoutSdk.connection.getAccountInfo(member1.wallet.publicKey);
            const tx = await fanoutSdk.sendInstructions(
                ix.instructions,
                [distBot],
                distBot.publicKey
            );

            if (!!tx.RpcResponseAndContext.value.err) {
                const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
                console.log(txdetails, tx.RpcResponseAndContext.value.err);
            }
            const voucher = await fanoutSdk.fetch<FanoutMembershipVoucher>(ix.output.membershipVoucher, FanoutMembershipVoucher);
            const memberAfter = await fanoutSdk.connection.getAccountInfo(member1.wallet.publicKey);
            expect(voucher.lastInflow.toString()).to.equal(`${firstSnapshot}`)
            expect(voucher.shares.toString()).to.equal(`${(100 ** 6) / 5}`)
            // @ts-ignore
            expect(memberAfter?.lamports - memberBefore?.lamports).to.equal(firstMemberAmount)

        });

        it("Unstake a Native Fanout with Token Members", async () => {
            const membershipMint = await Token.createMint(
                connection,
                authorityWallet,
                authorityWallet.publicKey,
                null,
                6,
                TOKEN_PROGRAM_ID
            );
            const distBot = new Keypair();
            await airdrop(connection, distBot.publicKey, 1);
            let builtFanout = await builtTokenFanout(membershipMint, authorityWallet, fanoutSdk, 100, 5);
            const sent = 10;
            const beforeUnstake = await fanoutSdk.fetch<Fanout>(builtFanout.fanout,Fanout);
            await airdrop(connection, builtFanout.fanoutAccountData.accountKey, sent);
            const firstSnapshot = sent * LAMPORTS_PER_SOL;
            const firstMemberAmount = firstSnapshot * 0.2
            let member1 = builtFanout.members[0];

            const memberFanoutSdk = new FanoutClient(
                connection,
                new NodeWallet(new Account(member1.wallet.secretKey))
            );
            let ix = await memberFanoutSdk.distributeTokenMemberInstructions(
                {
                    distributeForMint: false,
                    membershipMint: membershipMint.publicKey,
                    fanout: builtFanout.fanout,
                    member: member1.wallet.publicKey,
                    payer: member1.wallet.publicKey
                }
            );
            const voucherBefore = await memberFanoutSdk.fetch<FanoutMembershipVoucher>(ix.output.membershipVoucher, FanoutMembershipVoucher);
            await memberFanoutSdk.unstakeTokenMember({
                    fanout: builtFanout.fanout,
                    member: member1.wallet.publicKey,
                    payer: member1.wallet.publicKey
                }
            );
            const afterUnstake  = await memberFanoutSdk.fetch<Fanout>(builtFanout.fanout,Fanout);
            const memberAfter = await memberFanoutSdk.connection.getAccountInfo(member1.wallet.publicKey);
            expect(afterUnstake.totalStakedShares?.toString()).to.equal(`${(beforeUnstake?.totalStakedShares as BN).sub(voucherBefore.shares as BN)}`)
        });

        */
    });
});