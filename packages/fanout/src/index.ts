import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Commitment,
  Connection,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import { ProgramError } from "./systemErrors";
import {
  createProcessInitInstruction,
  createProcessInitForMintInstruction,
  createProcessAddMemberNftInstruction,
  createProcessDistributeNftInstruction,
} from "./generated/instructions";
import { MembershipModel } from "./generated/types";
export * from "./generated/types";
export * from "./generated/instructions";
export * from "./generated/accounts";
export * from "./generated/errors";
import { MetadataProgram } from "@metaplex-foundation/mpl-token-metadata";
import BN from "bn.js";
export interface InstructionResult<A> {
  instructions: TransactionInstruction[];
  signers: Signer[];
  output: A;
}

interface InitializeFanoutArgs {
  name: string;
  membershipModel: MembershipModel;
  totalShares: number;
  mint?: PublicKey;
}

interface InitializeFanoutForMintArgs {
  fanout: PublicKey;
  mint: PublicKey;
  mintTokenAccount?: PublicKey;
}

interface AddMemberArgs {
  shares: number;
  fanout: PublicKey;
  fanoutNativeAccount: PublicKey;
  mint: PublicKey;
}

interface DistributeNftMemberArgs {
  distributeForMint: boolean;
  member: PublicKey;
  membershipKey: PublicKey;
  fanout: PublicKey;
  fanoutForMint?: PublicKey;
  fanoutMint?: PublicKey;
  payer: PublicKey;
}

const MPL_TM_BUF = MetadataProgram.PUBKEY.toBuffer();
const MPL_TM_PREFIX = "metadata";

export interface TransactionResult {
  RpcResponseAndContext: RpcResponseAndContext<SignatureResult>;
  TransactionSignature: TransactionSignature;
}

export interface Wallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

function promiseLog(c: any): any {
  console.info(c);
  return c;
}

export class FanoutClient {
  connection: Connection;
  wallet: Wallet;

  static ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

  static async init(
    connection: Connection,
    wallet: Wallet
  ): Promise<FanoutClient> {
    return new FanoutClient(connection, wallet);
  }

  constructor(connection: Connection, wallet: Wallet) {
    this.connection = connection;
    this.wallet = wallet;
  }

  async fetch<T>(key: PublicKey, type: any): Promise<T> {
    let a = await this.connection.getAccountInfo(key);
    return type.fromAccountInfo(a)[0] as T;
  }

  async sendInstructions(
    instructions: TransactionInstruction[],
    signers: Signer[],
    payer?: PublicKey
  ): Promise<TransactionResult> {
    let tx = new Transaction();
    tx.feePayer = payer || this.wallet.publicKey;
    tx.add(...instructions);
    tx.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
    if (signers?.length > 0) {
      await tx.sign(...signers);
    } else {
      tx = await this.wallet.signTransaction(tx);
    }
    try {
      const sig = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
      return {
        RpcResponseAndContext: await this.connection.confirmTransaction(
          sig,
          this.connection.commitment
        ),
        TransactionSignature: sig,
      };
    } catch (e) {
      const wrappedE = ProgramError.parse(e);
      throw wrappedE == null ? e : wrappedE;
    }
  }

  static async fanoutKey(
    name: String,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("fanout-config"), Buffer.from(name)],
      programId
    );
  }

  static async fanoutForMintKey(
    fanout: PublicKey,
    mint: PublicKey,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("fanout-config"), fanout.toBuffer(), mint.toBuffer()],
      programId
    );
  }

  static async membershipVoucher(
    fanout: PublicKey,
    membershipKey: PublicKey,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("fanout-membership"),
        fanout.toBuffer(),
        membershipKey.toBuffer(),
      ],
      programId
    );
  }

  static async mintMembershipVoucher(
    fanoutForMintConfig: PublicKey,
    membershipMint: PublicKey,
    fanoutMint: PublicKey,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("fanout-membership"),
        fanoutForMintConfig.toBuffer(),
        membershipMint.toBuffer(),
        fanoutMint.toBuffer(),
      ],
      programId
    );
  }

  static async freezeAuthority(
    mint: PublicKey,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("freeze-authority"), mint.toBuffer()],
      programId
    );
  }

  static async nativeAccount(
    fanoutAccountKey: PublicKey,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("fanout-native-account"), fanoutAccountKey.toBuffer()],
      programId
    );
  }

  async initializeFanoutInstructions(
    opts: InitializeFanoutArgs
  ): Promise<
    InstructionResult<{ fanout: PublicKey; nativeAccount: PublicKey }>
  > {
    const [fanoutConfig, fanoutConfigBumpSeed] = await FanoutClient.fanoutKey(
      opts.name
    );
    const [holdingAccount, holdingAccountBumpSeed] =
      await FanoutClient.nativeAccount(fanoutConfig);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let membershipMint = NATIVE_MINT;
    if (opts.membershipModel == MembershipModel.Token) {
      if (!opts.mint) {
        throw new Error(
          "Missing mint account for token based membership model"
        );
      }
      membershipMint = opts.mint;
    }
    instructions.push(
      createProcessInitInstruction(
        {
          authority: this.wallet.publicKey,
          holdingAccount: holdingAccount,
          fanout: fanoutConfig,
          membershipMint: membershipMint,
        },
        {
          args: {
            bumpSeed: fanoutConfigBumpSeed,
            nativeAccountBumpSeed: holdingAccountBumpSeed,
            totalShares: opts.totalShares,
            name: opts.name,
          },
          model: opts.membershipModel,
        }
      )
    );
    return {
      output: {
        fanout: fanoutConfig,
        nativeAccount: holdingAccount,
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
      await FanoutClient.fanoutForMintKey(opts.fanout, opts.mint);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let tokenAccountForMint =
      opts.mintTokenAccount ||
      (await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        opts.mint,
        opts.fanout,
        true
      ));
    instructions.push(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        opts.mint,
        tokenAccountForMint,
        opts.fanout,
        this.wallet.publicKey
      )
    );
    instructions.push(
      createProcessInitForMintInstruction(
        {
          authority: this.wallet.publicKey,
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
    const [membershipAccount, voucherBumpSeed] =
      await FanoutClient.membershipVoucher(opts.fanout, opts.mint);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    const [metadata, _] = await PublicKey.findProgramAddress(
      [Buffer.from(MPL_TM_PREFIX), MPL_TM_BUF, opts.mint.toBuffer()],
      MetadataProgram.PUBKEY
    );
    instructions.push(
      createProcessAddMemberNftInstruction(
        {
          authority: this.wallet.publicKey,
          fanout: opts.fanout,
          membershipAccount,
          mint: opts.mint,
          metadata,
        },
        {
          args: {
            voucherBumpSeed,
            shares: opts.shares,
          },
        }
      )
    );

    return {
      output: {
        membershipAccount,
      },
      instructions,
      signers,
    };
  }

  async distributeNftMemberInstructions(opts: DistributeNftMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      fanoutForMintMembershipVoucher?: PublicKey;
      holdingAccount: PublicKey;
    }>
  > {
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let fanoutForMint = SystemProgram.programId;
    let fanoutMint = SystemProgram.programId;
    let fanoutMintMembership = SystemProgram.programId;
    let fanoutMintMemberTokenAccount = SystemProgram.programId;
    let fanoutForMintMembershipVoucherBumpSeed;
    const [nativeAccount, _nativeAccountBump] =
      await FanoutClient.nativeAccount(opts.fanout);
    let holdingAccount = nativeAccount;
    fanoutMint = opts.fanoutMint || NATIVE_MINT;
    fanoutMintMemberTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      fanoutMint,
      opts.member
    );
    if (opts.distributeForMint) {
      holdingAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        fanoutMint,
        nativeAccount
      );
    }
    const membershipKeyTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      opts.membershipKey,
      opts.member
    );
    const [membershipVoucher, membershipVoucherBump] =
      await FanoutClient.membershipVoucher(opts.fanout, opts.membershipKey);
    console.log("m", membershipVoucher.toBase58());
    instructions.push(
      createProcessDistributeNftInstruction(
        {
          fanoutForMint: fanoutForMint,
          fanoutMint: fanoutMint,
          membershipKey: opts.membershipKey,
          membershipVoucher: membershipVoucher,
          fanoutForMintMembershipVoucher: fanoutMintMembership,
          holdingAccount,
          membershipMintTokenAccount: membershipKeyTokenAccount,
          fanoutMintMemberTokenAccount,
          payer: opts.payer,
          member: opts.member,
          fanout: opts.fanout,
        },
        {
          fanoutMembershipMintBumpSeed:
            fanoutForMintMembershipVoucherBumpSeed || 0,
          distributeForMint: opts.distributeForMint,
        }
      )
    );

    return {
      output: {
        membershipVoucher,
        fanoutForMintMembershipVoucher: fanoutMintMembership,
        holdingAccount,
      },
      instructions,
      signers,
    };
  }

  async initializeFanout(
    opts: InitializeFanoutArgs
  ): Promise<{ fanout: PublicKey; nativeAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.initializeFanoutInstructions(opts);
    await this.sendInstructions(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async initializeFanoutForMint(
    opts: InitializeFanoutForMintArgs
  ): Promise<{ fanoutForMint: PublicKey; tokenAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.initializeFanoutForMintInstructions(opts);
    await this.sendInstructions(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async addMemberNft(
    opts: AddMemberArgs
  ): Promise<{ membershipAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.addMemberNftInstructions(opts);
    await this.sendInstructions(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async distributeNft(opts: DistributeNftMemberArgs): Promise<{
    membershipVoucher: PublicKey;
    fanoutForMintMembershipVoucher?: PublicKey;
    holdingAccount: PublicKey;
  }> {
    const { instructions, signers, output } =
      await this.distributeNftMemberInstructions(opts);
    await this.sendInstructions(instructions, signers, this.wallet.publicKey);
    return output;
  }
}
