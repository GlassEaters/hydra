import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import {
  AccountLayout,
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
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionError,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import { ProgramError } from "./systemErrors";
import {
  createProcessInitInstruction,
  createProcessInitForMintInstruction,
  createProcessAddMemberNftInstruction,
  createProcessDistributeNftInstruction,
  createProcessAddMemberWalletInstruction,
  createProcessDistributeWalletInstruction,
  createProcessSetTokenMemberStakeInstruction,
  createProcessDistributeTokenInstruction,
  createProcessUnstakeInstruction,
} from "./generated/instructions";
import { MembershipModel } from "./generated/types";
import { Fanout } from "./generated/accounts";
export * from "./generated/types";
export * from "./generated/accounts";
export * from "./generated/errors";
import { MetadataProgram } from "@metaplex-foundation/mpl-token-metadata";

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
  fanoutNativeAccount?: PublicKey;
  membershipKey: PublicKey;
}

interface StakeMemberArgs {
  shares: number;
  fanout: PublicKey;
  membershipMint?: PublicKey;
  membershipMintTokenAccount?: PublicKey;
  fanoutNativeAccount?: PublicKey;
  member: PublicKey;
  payer: PublicKey;
}

interface UnstakeMemberArgs {
  fanout: PublicKey;
  membershipMint?: PublicKey;
  membershipMintTokenAccount?: PublicKey;
  fanoutNativeAccount?: PublicKey;
  member: PublicKey;
  payer: PublicKey;
}

interface DistributeMemberArgs {
  distributeForMint: boolean;
  member: PublicKey;
  membershipKey?: PublicKey;
  fanout: PublicKey;
  fanoutMint?: PublicKey;
  payer: PublicKey;
}

interface DistributeTokenMemberArgs {
  distributeForMint: boolean;
  member: PublicKey;
  membershipMint: PublicKey;
  fanout: PublicKey;
  fanoutMint?: PublicKey;
  membershipMintTokenAccount?: PublicKey;
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

  private async throwingSend(
    instructions: TransactionInstruction[],
    signers: Signer[],
    payer?: PublicKey
  ): Promise<TransactionResult> {
    let res = await this.sendInstructions(
      instructions,
      signers,
      payer || this.wallet.publicKey
    );
    if (res.RpcResponseAndContext.value.err != null) {
      console.log(
        await this.connection.getConfirmedTransaction(res.TransactionSignature)
      );
      throw new Error(JSON.stringify(res.RpcResponseAndContext.value.err));
    }
    return res;
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

  async addMemberWalletInstructions(
    opts: AddMemberArgs
  ): Promise<InstructionResult<{ membershipAccount: PublicKey }>> {
    const [membershipAccount, voucherBumpSeed] =
      await FanoutClient.membershipVoucher(opts.fanout, opts.membershipKey);
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    instructions.push(
      createProcessAddMemberWalletInstruction(
        {
          authority: this.wallet.publicKey,
          fanout: opts.fanout,
          membershipAccount,
          member: opts.membershipKey,
        },
        {
          args: {
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

  async addMemberNftInstructions(
    opts: AddMemberArgs
  ): Promise<InstructionResult<{ membershipAccount: PublicKey }>> {
    const [membershipAccount, _vb] = await FanoutClient.membershipVoucher(
      opts.fanout,
      opts.membershipKey
    );
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    const [metadata, _md] = await PublicKey.findProgramAddress(
      [Buffer.from(MPL_TM_PREFIX), MPL_TM_BUF, opts.membershipKey.toBuffer()],
      MetadataProgram.PUBKEY
    );
    instructions.push(
      createProcessAddMemberNftInstruction(
        {
          authority: this.wallet.publicKey,
          fanout: opts.fanout,
          membershipAccount,
          mint: opts.membershipKey,
          metadata,
        },
        {
          args: {
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

  async unstakeTokenMemberInstructions(opts: UnstakeMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      membershipMintTokenAccount: PublicKey;
      stakeAccount: PublicKey;
    }>
  > {
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let mint = opts.membershipMint;
    if (!mint) {
      let data = await this.fetch<Fanout>(opts.fanout, Fanout);
      mint = data.membershipMint as PublicKey;
    }
    const [voucher, _vbump] = await FanoutClient.membershipVoucher(
      opts.fanout,
      opts.member
    );
    const stakeAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint,
      voucher,
      true
    );
    const membershipMintTokenAccount =
      opts.membershipMintTokenAccount ||
      (await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        opts.member
      ));
    instructions.push(
      createProcessUnstakeInstruction({
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        fanout: opts.fanout,
        member: opts.member,
        memberStakeAccount: stakeAccount,
        membershipVoucher: voucher,
        membershipMint: mint,
        membershipMintTokenAccount: membershipMintTokenAccount,
      })
    );
    return {
      output: {
        membershipVoucher: voucher,
        membershipMintTokenAccount,
        stakeAccount,
      },
      instructions,
      signers,
    };
  }

  async stakeTokenMemberInstructions(opts: StakeMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      membershipMintTokenAccount: PublicKey;
      stakeAccount: PublicKey;
    }>
  > {
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let mint = opts.membershipMint;
    if (!mint) {
      let data = await this.fetch<Fanout>(opts.fanout, Fanout);
      mint = data.membershipMint as PublicKey;
    }
    const [voucher, _vbump] = await FanoutClient.membershipVoucher(
      opts.fanout,
      opts.member
    );
    const stakeAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint,
      voucher,
      true
    );
    const membershipMintTokenAccount =
      opts.membershipMintTokenAccount ||
      (await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        opts.member
      ));
    try {
      await this.connection.getTokenAccountBalance(stakeAccount);
    } catch (e) {
      instructions.push(
        await Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          mint,
          stakeAccount,
          voucher,
          opts.payer
        )
      );
    }
    try {
      await this.connection.getTokenAccountBalance(membershipMintTokenAccount);
    } catch (e) {
      throw new Error(
        "Membership mint token account for member must be initialized"
      );
    }
    instructions.push(
      createProcessSetTokenMemberStakeInstruction(
        {
          fanout: opts.fanout,
          member: opts.member,
          memberStakeAccount: stakeAccount,
          membershipVoucher: voucher,
          membershipMint: mint,
          membershipMintTokenAccount: membershipMintTokenAccount,
        },
        {
          shares: opts.shares,
        }
      )
    );
    return {
      output: {
        membershipVoucher: voucher,
        membershipMintTokenAccount,
        stakeAccount,
      },
      instructions,
      signers,
    };
  }

  async distributeTokenMemberInstructions(
    opts: DistributeTokenMemberArgs
  ): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      fanoutForMintMembershipVoucher?: PublicKey;
      holdingAccount: PublicKey;
    }>
  > {
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let fanoutMint = opts.fanoutMint || NATIVE_MINT;
    let holdingAccount;
    let [fanoutForMint, fanoutForMintBump] =
      await FanoutClient.fanoutForMintKey(opts.fanout, fanoutMint);

    let [
      fanoutForMintMembershipVoucher,
      fanoutForMintMembershipVoucherBumpSeed,
    ] = await FanoutClient.mintMembershipVoucher(
      fanoutForMint,
      opts.member,
      fanoutMint
    );
    let fanoutMintMemberTokenAccount = await Token.getAssociatedTokenAddress(
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
        opts.fanout,
        true
      );
      try {
        await this.connection.getTokenAccountBalance(
          fanoutMintMemberTokenAccount
        );
      } catch (e) {
        instructions.push(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            fanoutMint,
            fanoutMintMemberTokenAccount,
            opts.member,
            opts.payer
          )
        );
      }
    } else {
      const [nativeAccount, _nativeAccountBump] =
        await FanoutClient.nativeAccount(opts.fanout);
      holdingAccount = nativeAccount;
    }
    const [membershipVoucher, membershipVoucherBump] =
      await FanoutClient.membershipVoucher(opts.fanout, opts.member);
    const stakeAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      opts.membershipMint,
      membershipVoucher,
      true
    );
    const membershipMintTokenAccount =
      opts.membershipMintTokenAccount ||
      (await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        opts.membershipMint,
        opts.member
      ));
    try {
      await this.connection.getTokenAccountBalance(stakeAccount);
    } catch (e) {
      instructions.push(
        await Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          opts.membershipMint,
          stakeAccount,
          membershipVoucher,
          opts.payer
        )
      );
    }
    instructions.push(
      createProcessDistributeTokenInstruction(
        {
          memberStakeAccount: stakeAccount,
          membershipMint: opts.membershipMint,
          fanoutForMint: fanoutForMint,
          fanoutMint: fanoutMint,
          membershipVoucher: membershipVoucher,
          fanoutForMintMembershipVoucher,
          holdingAccount,
          membershipMintTokenAccount: membershipMintTokenAccount,
          fanoutMintMemberTokenAccount,
          payer: opts.payer,
          member: opts.member,
          fanout: opts.fanout,
        },
        {
          distributeForMint: opts.distributeForMint,
        }
      )
    );

    return {
      output: {
        membershipVoucher,
        fanoutForMintMembershipVoucher,
        holdingAccount,
      },
      instructions,
      signers,
    };
  }

  async distributeNftMemberInstructions(opts: DistributeMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      fanoutForMintMembershipVoucher?: PublicKey;
      holdingAccount: PublicKey;
    }>
  > {
    if (!opts.membershipKey) {
      throw new Error("Missing membership key");
    }
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let fanoutMint = opts.fanoutMint || NATIVE_MINT;
    let holdingAccount;
    let [fanoutForMint, fanoutForMintBump] =
      await FanoutClient.fanoutForMintKey(opts.fanout, fanoutMint);

    let [
      fanoutForMintMembershipVoucher,
      fanoutForMintMembershipVoucherBumpSeed,
    ] = await FanoutClient.mintMembershipVoucher(
      fanoutForMint,
      opts.membershipKey,
      fanoutMint
    );
    let fanoutMintMemberTokenAccount = await Token.getAssociatedTokenAddress(
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
        opts.fanout,
        true
      );
      try {
        await this.connection.getTokenAccountBalance(
          fanoutMintMemberTokenAccount
        );
      } catch (e) {
        instructions.push(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            fanoutMint,
            fanoutMintMemberTokenAccount,
            opts.member,
            opts.payer
          )
        );
      }
    } else {
      const [nativeAccount, _nativeAccountBump] =
        await FanoutClient.nativeAccount(opts.fanout);
      holdingAccount = nativeAccount;
    }
    const membershipKeyTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      opts.membershipKey,
      opts.member
    );
    const [membershipVoucher, membershipVoucherBump] =
      await FanoutClient.membershipVoucher(opts.fanout, opts.membershipKey);
    instructions.push(
      createProcessDistributeNftInstruction(
        {
          fanoutForMint: fanoutForMint,
          fanoutMint: fanoutMint,
          membershipKey: opts.membershipKey,
          membershipVoucher: membershipVoucher,
          fanoutForMintMembershipVoucher,
          holdingAccount,
          membershipMintTokenAccount: membershipKeyTokenAccount,
          fanoutMintMemberTokenAccount,
          payer: opts.payer,
          member: opts.member,
          fanout: opts.fanout,
        },
        {
          distributeForMint: opts.distributeForMint,
        }
      )
    );

    return {
      output: {
        membershipVoucher,
        fanoutForMintMembershipVoucher,
        holdingAccount,
      },
      instructions,
      signers,
    };
  }

  async distributeWalletMemberInstructions(opts: DistributeMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      fanoutForMintMembershipVoucher?: PublicKey;
      holdingAccount: PublicKey;
    }>
  > {
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let fanoutMint = opts.fanoutMint || NATIVE_MINT;
    let holdingAccount;
    let [fanoutForMint, fanoutForMintBump] =
      await FanoutClient.fanoutForMintKey(opts.fanout, fanoutMint);
    let [
      fanoutForMintMembershipVoucher,
      fanoutForMintMembershipVoucherBumpSeed,
    ] = await FanoutClient.mintMembershipVoucher(
      fanoutForMint,
      opts.member,
      fanoutMint
    );
    let fanoutMintMemberTokenAccount = await Token.getAssociatedTokenAddress(
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
        opts.fanout,
        true
      );
      try {
        await this.connection.getTokenAccountBalance(
          fanoutMintMemberTokenAccount
        );
      } catch (e) {
        instructions.push(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            fanoutMint,
            fanoutMintMemberTokenAccount,
            opts.member,
            opts.payer
          )
        );
      }
    } else {
      const [nativeAccount, _nativeAccountBump] =
        await FanoutClient.nativeAccount(opts.fanout);
      holdingAccount = nativeAccount;
    }
    const [membershipVoucher, membershipVoucherBump] =
      await FanoutClient.membershipVoucher(opts.fanout, opts.member);
    instructions.push(
      createProcessDistributeWalletInstruction(
        {
          fanoutForMint: fanoutForMint,
          fanoutMint: fanoutMint,
          membershipVoucher: membershipVoucher,
          fanoutForMintMembershipVoucher,
          holdingAccount,
          fanoutMintMemberTokenAccount,
          payer: opts.payer,
          member: opts.member,
          fanout: opts.fanout,
        },
        {
          distributeForMint: opts.distributeForMint,
        }
      )
    );

    return {
      output: {
        membershipVoucher,
        fanoutForMintMembershipVoucher,
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
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async initializeFanoutForMint(
    opts: InitializeFanoutForMintArgs
  ): Promise<{ fanoutForMint: PublicKey; tokenAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.initializeFanoutForMintInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async addMemberNft(
    opts: AddMemberArgs
  ): Promise<{ membershipAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.addMemberNftInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async addMemberWallet(
    opts: AddMemberArgs
  ): Promise<{ membershipAccount: PublicKey }> {
    const { instructions, signers, output } =
      await this.addMemberWalletInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async stakeTokenMember(opts: StakeMemberArgs) {
    const { instructions, signers, output } =
      await this.stakeTokenMemberInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async unstakeTokenMember(opts: UnstakeMemberArgs) {
    let { fanout, member, membershipMint, payer } = opts;
    if (!membershipMint) {
      let data = await this.fetch<Fanout>(opts.fanout, Fanout);
      membershipMint = data.membershipMint as PublicKey;
    }
    const {
      instructions: unstake_ix,
      signers: unstake_signers,
      output,
    } = await this.unstakeTokenMemberInstructions(opts);
    const { instructions: dist_ix, signers: dist_signers } =
      await this.distributeTokenMemberInstructions({
        distributeForMint: false,
        fanout,
        member,
        membershipMint,
        payer,
      });
    await this.throwingSend(
      [...dist_ix, ...unstake_ix],
      [...unstake_signers, ...dist_signers],
      this.wallet.publicKey
    );
    return output;
  }

  async distributeNft(opts: DistributeMemberArgs): Promise<{
    membershipVoucher: PublicKey;
    fanoutForMintMembershipVoucher?: PublicKey;
    holdingAccount: PublicKey;
  }> {
    const { instructions, signers, output } =
      await this.distributeNftMemberInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async distributeWallet(opts: DistributeMemberArgs): Promise<{
    membershipVoucher: PublicKey;
    fanoutForMintMembershipVoucher?: PublicKey;
    holdingAccount: PublicKey;
  }> {
    const { instructions, signers, output } =
      await this.distributeWalletMemberInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async distributeToken(opts: DistributeTokenMemberArgs): Promise<{
    membershipVoucher: PublicKey;
    fanoutForMintMembershipVoucher?: PublicKey;
    holdingAccount: PublicKey;
  }> {
    const { instructions, signers, output } =
      await this.distributeTokenMemberInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }
}
