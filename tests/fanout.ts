import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Fanout, FanoutIDL } from '@hydra/fanout';
import { PublicKey, Keypair } from "@solana/web3.js";
import { createMint } from "@project-serum/common";
import { TokenUtils } from './utils/token';
import { expect, use } from 'chai';
import ChaiAsPromised from "chai-as-promised";

use(ChaiAsPromised);

describe('fanout', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.Fanout as Program<FanoutIDL>;
  const fanoutSdk = new Fanout(provider, program);
  const tokenUtils = new TokenUtils(provider);

  let sharesMint: PublicKey;
  let mintToSplit: PublicKey;
  let accountToSplit: PublicKey;
  const me = provider.wallet.publicKey;
  const splitWallet = Keypair.generate()
  let fanout: PublicKey;

  before(async () => {
    mintToSplit = await createMint(provider, me, 0);
    accountToSplit = await tokenUtils.createAtaAndMint(provider, mintToSplit, 0, splitWallet.publicKey);

    const { instructions, signers, output: { fanout: fanoutOut, mint: mintOut } } = await fanoutSdk.initializeFanoutInstructions({
      shares: 100,
      account: accountToSplit
    })
    sharesMint = mintOut;

    fanout = fanoutOut;

    await fanoutSdk.sendInstructions(instructions, [...signers, splitWallet], provider.wallet.publicKey);
  })

  it('Correctly initializes a fanout', async () => {
    const fanoutAcct = await fanoutSdk.account.fanoutV0.fetch(fanout);
    expect(fanoutAcct.account.toBase58()).to.equal(accountToSplit.toBase58());
  });

  describe("after staking", () => {
    let voucher: PublicKey;
    let destination: PublicKey;
    let voucher2: PublicKey;
    let destination2: PublicKey;
    const secondShareHolder = Keypair.generate()

    before(async () => {
      // Send some shares to another shareholder
      const shareholder2VoucherAccount = await tokenUtils.sendTokens(provider, sharesMint, secondShareHolder.publicKey, 20);
      const result = await fanoutSdk.stake({
        fanout
      });
      voucher = result.voucher;
      destination = result.destination;
      const result2 = await fanoutSdk.stake({
        fanout,
        voucherAccount: shareholder2VoucherAccount
      });
      voucher2 = result2.voucher;
      destination2 = result2.destination;
      
      await tokenUtils.mintTo(mintToSplit, 1000, accountToSplit);
    })

    it('creates the staking voucher', async () => {
      const voucherAcct = await fanoutSdk.account.fanoutVoucherV0.fetch(voucher);
      expect(voucherAcct.fanout.toBase58()).to.equal(fanout.toBase58())
    })

    it('gives us our share of the account', async () => {
      await fanoutSdk.distribute({
        voucher
      });
      await fanoutSdk.distribute({
        voucher: voucher2
      });
      await tokenUtils.expectBalance(destination, 800);
      await tokenUtils.expectBalance(destination2, 200);
    })
  })
});
