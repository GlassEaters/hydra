import * as anchor from "@project-serum/anchor";
import { BorshAccountsCoder, Program, Provider } from "@project-serum/anchor";
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
  Finality,
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
  createProcessSetForTokenMemberStakeInstruction,
  createProcessDistributeTokenInstruction,
  createProcessUnstakeInstruction,
  createProcessSignMetadataInstruction,
} from "./generated/instructions";
import { MembershipModel } from "./generated/types";
import { Fanout, FanoutMembershipVoucher } from "./generated/accounts";

export * from "./generated/types";
export * from "./generated/accounts";
export * from "./generated/errors";
import { MetadataProgram } from "@metaplex-foundation/mpl-token-metadata";
import {
  BigInstructionResult,
  InstructionResult,
  sendMultipleInstructions,
} from "@strata-foundation/spl-utils";
import bs58 from "bs58";
import { getTokenAccount } from "@project-serum/common";
import { chunks } from "./utils";

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
  fanoutAuthority?: PublicKey;
  membershipMint?: PublicKey;
  membershipMintTokenAccount?: PublicKey;
  fanoutNativeAccount?: PublicKey;
  member: PublicKey;
  payer: PublicKey;
}

interface SignMetadataArgs {
  fanout: PublicKey;
  authority?: PublicKey;
  holdingAccount?: PublicKey;
  metadata: PublicKey;
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

interface DistributeAllArgs {
  fanout: PublicKey;
  mint: PublicKey;
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
  provider: Provider;

  static ID = new PublicKey("hyDQ4Nz1eYyegS6JfenyKwKzYxRsCWCriYSAjtzP4Vg");

  static async init(
    connection: Connection,
    wallet: Wallet
  ): Promise<FanoutClient> {
    return new FanoutClient(connection, wallet);
  }

  constructor(connection: Connection, wallet: Wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.provider = new Provider(connection, wallet, {});
  }

  async fetch<T>(key: PublicKey, type: any): Promise<T> {
    let a = await this.connection.getAccountInfo(key);
    return type.fromAccountInfo(a)[0] as T;
  }

  async getMembers({ fanout }: { fanout: PublicKey }): Promise<PublicKey[]> {
    const name = "fanoutMembershipVoucher";
    const descriminator = BorshAccountsCoder.accountDiscriminator(name);
    const filters = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(Buffer.concat([descriminator, fanout.toBuffer()])),
        },
      },
    ];
    const members = await this.connection.getProgramAccounts(FanoutClient.ID, {
      // Get the membership key
      dataSlice: {
        length: 32,
        offset: 8 + 32 + 8 + 8 + 1,
      },
      filters,
    });

    return members.map((mem) => new PublicKey(mem.account.data));
  }

  async executeBig<Output>(
    command: Promise<BigInstructionResult<Output>>,
    payer: PublicKey = this.wallet.publicKey,
    finality?: Finality
  ): Promise<Output> {
    const { instructions, signers, output } = await command;
    if (instructions.length > 0) {
      await sendMultipleInstructions(
        new Map(),
        this.provider,
        instructions,
        signers,
        payer || this.wallet.publicKey,
        finality
      );
    }
    return output;
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
    membershipKey: PublicKey,
    fanoutMint: PublicKey,
    programId: PublicKey = FanoutClient.ID
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("fanout-membership"),
        fanoutForMintConfig.toBuffer(),
        membershipKey.toBuffer(),
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
        opts.member,
        true
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

  async stakeForTokenMemberInstructions(opts: StakeMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      membershipMintTokenAccount: PublicKey;
      stakeAccount: PublicKey;
    }>
  > {
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    let mint = opts.membershipMint;
    let auth = opts.fanoutAuthority;
    if (!mint || !auth) {
      let data = await this.fetch<Fanout>(opts.fanout, Fanout);
      mint = data.membershipMint as PublicKey;
      auth = data.authority as PublicKey;
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
        auth,
        true
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
        "Membership mint token account for authority must be initialized"
      );
    }
    instructions.push(
      createProcessSetForTokenMemberStakeInstruction(
        {
          fanout: opts.fanout,
          authority: auth,
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
        opts.member,
        true
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

  async signMetadataInstructions(
    opts: SignMetadataArgs
  ): Promise<InstructionResult<{}>> {
    let authority = opts.authority,
      holdingAccount = opts.holdingAccount;
    if (!authority || !holdingAccount) {
      const fanoutObj = await this.fetch<Fanout>(opts.fanout, Fanout);
      authority = fanoutObj.authority as PublicKey;
      holdingAccount = fanoutObj.accountKey as PublicKey;
    }
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];
    instructions.push(
      createProcessSignMetadataInstruction({
        fanout: opts.fanout,
        authority: authority,
        holdingAccount: holdingAccount,
        metadata: opts.metadata,
        tokenMetadataProgram: MetadataProgram.PUBKEY,
      })
    );
    return {
      output: {},
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
    let fanoutMintMemberTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      fanoutMint,
      opts.member,
      true
    );
    let [
      fanoutForMintMembershipVoucher,
      fanoutForMintMembershipVoucherBumpSeed,
    ] = await FanoutClient.mintMembershipVoucher(
      fanoutForMint,
      opts.member,
      fanoutMint
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
        opts.member,
        true
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

  async distributeAllInstructions({
    fanout,
    mint,
    payer,
  }: DistributeAllArgs): Promise<BigInstructionResult<null>> {
    const fanoutAcct = await Fanout.fromAccountAddress(this.connection, fanout);
    const members = await this.getMembers({ fanout });

    const instructions = await Promise.all(
      members.map(async (member) => {
        switch (fanoutAcct.membershipModel) {
          case MembershipModel.Token:
            return this.distributeTokenMemberInstructions({
              distributeForMint: !mint.equals(NATIVE_MINT),
              membershipMint: fanoutAcct.membershipMint!,
              fanout,
              member,
              fanoutMint: mint,
              payer: payer,
            });
          case MembershipModel.Wallet:
            return this.distributeWalletMemberInstructions({
              distributeForMint: !mint.equals(NATIVE_MINT),
              member,
              fanout,
              fanoutMint: mint,
              payer: payer,
            });
          case MembershipModel.NFT:
            const account = (
              await this.connection.getTokenLargestAccounts(member)
            ).value[0].address;
            const wallet = (await getTokenAccount(this.provider, account))
              .owner;
            return this.distributeNftMemberInstructions({
              distributeForMint: !mint.equals(NATIVE_MINT),
              fanout,
              fanoutMint: mint,
              membershipKey: member,
              member: wallet,
              payer: payer,
            });
        }
      })
    );

    // 3 at a time
    const grouped: InstructionResult<any>[][] = chunks(instructions, 3);

    return {
      instructions: grouped.map((i) => i.map((o) => o.instructions).flat()),
      signers: grouped.map((i) => i.map((o) => o.signers).flat()),
      output: null,
    };
  }

  async distributeAll(opts: DistributeAllArgs): Promise<null> {
    return this.executeBig(this.distributeAllInstructions(opts), opts.payer);
  }

  async distributeNftMemberInstructions(opts: DistributeMemberArgs): Promise<
    InstructionResult<{
      membershipVoucher: PublicKey;
      fanoutForMintMembershipVoucher?: PublicKey;
      holdingAccount: PublicKey;
    }>
  > {
    if (!opts.membershipKey) {
      throw new Error("No membership key");
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
      opts.member,
      true
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
      opts.member,
      true
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
      opts.member,
      true
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

  async stakeForTokenMember(opts: StakeMemberArgs) {
    const { instructions, signers, output } =
      await this.stakeForTokenMemberInstructions(opts);
    await this.throwingSend(instructions, signers, this.wallet.publicKey);
    return output;
  }

  async signMetadata(opts: SignMetadataArgs) {
    const { instructions, signers, output } =
      await this.signMetadataInstructions(opts);
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
