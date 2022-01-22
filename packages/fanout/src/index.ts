import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import account from "@project-serum/anchor/dist/cjs/program/namespace/account";
import {
  createTokenAccount,
  getTokenAccount,
  parseMintAccount,
} from "@project-serum/common";

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
import { min } from "bn.js";
import { FanoutIDL, MembershipModel } from "./generated/fanout";
export * from "./generated/fanout";

interface InitializeFanoutArgs {
  name: string;
  membershipModel: MembershipModel;
  totalShares: number;
  mint?: PublicKey;
}

interface InitializeFanoutForMintArgs {
  fanout: PublicKey;
  fanoutNativeAccount: PublicKey;
  mint: PublicKey;
  mintTokenAccount?: PublicKey;
}

interface AddMemberArgs {
  shares: number;
  voucherBumpSeed: number;
  fanout: PublicKey;
  fanoutNativeAccount: PublicKey;
  mint: PublicKey;
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
      [Buffer.from("fanout-config"), Buffer.from(name)],
      programId
    );
  }

  static async fanoutForMintKey(
    fanout: PublicKey,
    mint: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("fanout-config"), fanout.toBuffer(), mint.toBuffer()],
      programId
    );
  }

  static async membershipAccount(
    fanoutAccount: PublicKey,
    membershipKey: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("fanout-membership"),
        fanoutAccount.toBuffer(),
        membershipKey.toBuffer(),
      ],
      programId
    );
  }

  static async freezeAuthority(
    mint: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("freeze-authority"), mint.toBuffer()],
      programId
    );
  }

  static async nativeAccount(
    fanoutAccountKey: PublicKey,
    programId: PublicKey = Fanout.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("fanout-native-account"), fanoutAccountKey.toBuffer()],
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

  async initializeFanoutForMintInstructions(
    opts: InitializeFanoutForMintArgs
  ): Promise<
    InstructionResult<{ fanoutForMint: PublicKey; tokenAccount: PublicKey }>
  > {
    const [fanoutMintConfig, fanoutConfigBumpSeed] =
      await Fanout.fanoutForMintKey(opts.fanout, opts.mint);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let tokenAccountForMint =
      opts.mintTokenAccount ||
      (await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        opts.mint,
        opts.fanoutNativeAccount,
        true
      ));
    instructions.push(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        opts.mint,
        tokenAccountForMint,
        opts.fanoutNativeAccount,
        this.wallet.publicKey
      )
    );
    instructions.push(
      await this.instruction.initForMint(fanoutConfigBumpSeed, {
        accounts: {
          authority: this.wallet.publicKey,
          mintHoldingAccount: tokenAccountForMint,
          fanout: opts.fanout,
          mint: opts.mint,
          fanoutForMint: fanoutMintConfig,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
      })
    );

    return {
      output: {
        tokenAccount: tokenAccountForMint,
        fanoutForMint: fanoutMintConfig,
      },
      instructions,
      signers,
    };
  }

  async addMemberNftInstructions(
    opts: AddMemberArgs
  ): Promise<
    InstructionResult<{ fanoutForMint: PublicKey; tokenAccount: PublicKey }>
  > {
    const [fanoutMembership, fanoutMembershipBump] =
      await Fanout.membershipAccount(opts.fanout, opts.mint);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    instructions.push(
      await this.instruction.addMemberNft(
        {
          voucherBumpSeed: fanoutMembershipBump,
          shares: opts.shares,
        },
        {
          accounts: {
            authority: this.wallet.publicKey,
            account: opts.fanoutNativeAccount,
            fanout: opts.fanout,
            membershipAccount: fanoutMembership,
            mint: opts.mint,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
        }
      )
    );

    return {
      output: {
        tokenAccount: tokenAccountForMint,
        fanoutForMint: fanoutMintConfig,
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

  async initializeFanoutForMint(
    opts: InitializeFanoutForMintArgs
  ): Promise<{ fanoutForMint: PublicKey; tokenAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.initializeFanoutForMintInstructions(opts);
    await this.sendInstructions(
      instructions,
      signers,
      this.provider.wallet.publicKey
    );
    return output;
  }

  async addNFTMember(
    opts: InitializeFanoutForMintArgs
  ): Promise<{ fanoutForMint: PublicKey; tokenAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.initializeFanoutForMintInstructions(opts);
    await this.sendInstructions(
      instructions,
      signers,
      this.provider.wallet.publicKey
    );
    return output;
  }
}
