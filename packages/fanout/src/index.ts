import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import account from "@project-serum/anchor/dist/cjs/program/namespace/account";
import { getTokenAccount, parseMintAccount } from "@project-serum/common";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  InstructionResult,
  sendInstructions,
} from "@strata-foundation/spl-utils";
import { FanoutIDL, MembershipModel } from "./generated/fanout";
export * from "./generated/fanout";

interface InitializeFanoutArgs {
  name: string;
  membershipModel: MembershipModel;
  totalShares: number;
  mint?: PublicKey;
}

interface IStakeArgs {
  payer?: PublicKey;
  fanout: PublicKey;
  /** Account holding the fanout mint tokens. **Default:** The associated token account of this wallet */
  sharesAccount?: PublicKey;
  /** Destination for fanout tokens. **Default:** The associated token account of this wallet */
  destination?: PublicKey;
}

interface IUnstakeArgs {
  /** The account that will receive the sol locked in the voucher acct. **Default:** This wallet */
  refund?: PublicKey;
  voucher: PublicKey;
}

interface IDistributeArgs {
  payer?: PublicKey;
  /** The staking voucher to distribute funds to */
  voucher: PublicKey;
}

export class Fanout {
  program: Program<FanoutIDL>;
  provider: Provider;

  static ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

  static async init(
    provider: Provider,
    FanoutProgramId: PublicKey = Fanout.ID
  ): Promise<Fanout> {
    const FanoutIDLJson = await anchor.Program.fetchIdl(
      FanoutProgramId,
      provider
    );
    // @ts-ignore
    const prgrm = new anchor.Program<FanoutIDL>(
      // @ts-ignore
      FanoutIDLJson!,
      FanoutProgramId,
      provider
    );

    return new Fanout(provider, prgrm);
  }

  constructor(provider: Provider, program: Program<FanoutIDL>) {
    this.provider = provider;
    this.program = program;
  }

  get programId() {
    return this.program.programId;
  }

  get rpc() {
    return this.program.rpc;
  }

  get instruction() {
    return this.program.instruction;
  }

  get wallet() {
    return this.provider.wallet;
  }

  get account() {
    return this.program.account;
  }

  get errors() {
    let ret = new Map<number, string>();
    return (
      this.program.idl?.errors?.reduce((acc, err) => {
        acc.set(err.code, `${err.name}`);
        return acc;
      }, ret) || ret
    );
  }

  sendInstructions(
    instructions: TransactionInstruction[],
    signers: Signer[],
    payer?: PublicKey
  ): Promise<string> {
    return sendInstructions(
      this.errors,
      this.provider,
      instructions,
      signers,
      payer
    );
  }

  static async fanoutKey(
    name: String,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("fanout-config", "utf-8"), Buffer.from(name)],
      programId
    );
  }

  static async voucherKey(
    fanoutAccount: PublicKey,
    destination: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("voucher", "utf-8"),
        fanoutAccount.toBuffer(),
        destination.toBuffer(),
      ],
      programId
    );
  }

  static async voucherCounterKey(
    account: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("voucher-counter", "utf-8"), account.toBuffer()],
      programId
    );
  }

  static async freezeAuthority(
    mint: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("freeze-authority", "utf-8"), mint.toBuffer()],
      programId
    );
  }

  static async nativeAccount(
    fanoutAccountKey: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("native-account", "utf-8"), fanoutAccountKey.toBuffer()],
      programId
    );
  }

  async initializeFanoutInstructions(
    opts: InitializeFanoutArgs
  ): Promise<InstructionResult<{ fanout: PublicKey }>> {
    const [fanoutConfig, fanoutConfigBumpSeed] = await Fanout.fanoutKey(
      opts.name
    );
    const [holdingAccount, holdingAccountBumpSeed] = await Fanout.nativeAccount(
      fanoutConfig
    );
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let membershipMint = NATIVE_MINT;
    if (opts.membershipModel == MembershipModel.Token) {
      if (!opts.mint) {
        throw new Error(
          "Missing mint account for token bases membership model"
        );
      }
      membershipMint = opts.mint;
    }
    console.log(this.instruction);
    instructions.push(
      await this.instruction.init(
        {
          bumpSeed: fanoutConfigBumpSeed,
          nativeAccountBumpSeed: holdingAccountBumpSeed,
          totalShares: new anchor.BN(opts.totalShares),
          name: opts.name,
        },
        opts.membershipModel,
        {
          accounts: {
            authority: this.wallet.publicKey,
            holdingAccount: holdingAccount,
            fanout: fanoutConfig,
            membershipMint: membershipMint,
            rent: SYSVAR_RENT_PUBKEY,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          },
        }
      )
    );

    return {
      output: {
        fanout: fanoutConfig,
      },
      instructions,
      signers,
    };
  }

  async initializeFanout(
    opts: InitializeFanoutArgs
  ): Promise<{ fanout: PublicKey }> {
    const { instructions, signers, output } =
      await this.initializeFanoutInstructions(opts);
    await this.sendInstructions(
      instructions,
      signers,
      this.provider.wallet.publicKey
    );
    return output;
  }

  async initializeFanoutForMit() {}
}
