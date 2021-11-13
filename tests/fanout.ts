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

  let mintToSplit: PublicKey;
  let accountToSplit: PublicKey;
  const me = provider.wallet.publicKey;
  const splitWallet = Keypair.generate()
  let fanout: PublicKey;

  beforeEach(async () => {
    mintToSplit = await createMint(provider, me, 9);
    accountToSplit = await tokenUtils.createAtaAndMint(provider, mintToSplit, 1000, splitWallet.publicKey);

    const { instructions, signers, output: { fanout: fanoutOut } } = await fanoutSdk.initializeFanoutInstructions({
      shares: 100,
      account: accountToSplit
    })

    fanout = fanoutOut;

    await fanoutSdk.sendInstructions(instructions, [...signers, splitWallet], provider.wallet.publicKey);
  })

  it('Correctly initializes a fanout', async () => {
    const fanoutAcct = await fanoutSdk.account.fanoutV0.fetch(fanout);
    expect(fanoutAcct.account.toBase58()).to.equal(accountToSplit.toBase58());
  });
});
