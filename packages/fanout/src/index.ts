import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
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
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { InstructionResult } from "@strata-foundation/spl-utils";
import { ProgramError } from "./generated/errors";
import {
  createAddMemberNftInstruction,
  createInitForMintInstruction,
  createInitInstruction,
} from "./generated/instructions";
import { MembershipModel } from "./generated/types";
export * from "./generated/types";
export * from "./generated/instructions";
export * from "./generated/accounts";
export * from "./generated/errors";
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
  provider: Provider;

  static ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

  static async init(
    provider: Provider,
    FanoutProgramId: PublicKey = Fanout.ID
  ): Promise<Fanout> {
    return new Fanout(provider);
  }

  constructor(provider: Provider) {
    this.provider = provider;
  }

  async fetch<T>(key: PublicKey, type: any): Promise<T> {
    let a = await this.provider.connection.getAccountInfo(key);
    return type.fromAccountInfo(a)[0] as T;
  }

  async sendInstructions(
    instructions: TransactionInstruction[],
    signers: Signer[],
    payer?: PublicKey
  ): Promise<string> {
    const tx = new Transaction();
    tx.feePayer = payer || this.provider.wallet.publicKey;
    tx.add(...instructions);

    try {
      return await this.provider.send(tx, signers, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      });
    } catch (e) {
      console.error(e);
      const wrappedE = ProgramError.parse(e);
      throw wrappedE == null ? e : wrappedE;
    }
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
      createInitInstruction(
        {
          authority: this.provider.wallet.publicKey,
          holdingAccount: holdingAccount,
          fanout: fanoutConfig,
          membershipMint: membershipMint,
        },
        {
          args: {
            bumpSeed: fanoutConfigBumpSeed,
            nativeAccountBumpSeed: holdingAccountBumpSeed,
            totalShares: new anchor.BN(opts.totalShares),
            name: opts.name,
          },
          model: opts.membershipModel,
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
        this.provider.wallet.publicKey
      )
    );
    instructions.push(
      createInitForMintInstruction(
        {
          authority: this.provider.wallet.publicKey,
          mintHoldingAccount: tokenAccountForMint,
          fanout: opts.fanout,
          mint: opts.mint,
          fanoutForMint: fanoutMintConfig,
        },
        {
          bumpSeed: fanoutConfigBumpSeed,
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

  async addMemberNftInstructions(
    opts: AddMemberArgs
  ): Promise<InstructionResult<{ membershipAccount: PublicKey }>> {
    const [fanoutMembership, fanoutMembershipBump] =
      await Fanout.membershipAccount(opts.fanout, opts.mint);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    instructions.push(
      createAddMemberNftInstruction(
        {
          authority: this.provider.wallet.publicKey,
          account: opts.fanoutNativeAccount,
          fanout: opts.fanout,
          membershipAccount: fanoutMembership,
          mint: opts.mint,
        },
        {
          args: {
            voucherBumpSeed: fanoutMembershipBump,
            shares: new anchor.BN(opts.shares),
          },
        }
      )
    );

    return {
      output: {
        membershipAccount: fanoutMembership,
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
