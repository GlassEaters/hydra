import * as splToken from "@solana/spl-token";
import * as definedTypes from "../types";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

export type InitInstructionArgs = {
  args: definedTypes.InitializeFanoutArgs;
  model: definedTypes.MembershipModel;
};
const initStruct = new beet.FixableBeetArgsStruct<
  InitInstructionArgs & {
    instructionDiscriminator: number[];
  }
>(
  [
    ["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["args", definedTypes.initializeFanoutArgsStruct],
    ["model", definedTypes.membershipModelEnum],
  ],
  "InitInstructionArgs"
);
export type InitInstructionAccounts = {
  authority: web3.PublicKey;
  fanout: web3.PublicKey;
  holdingAccount: web3.PublicKey;
  membershipMint: web3.PublicKey;
};

const initInstructionDiscriminator = [220, 59, 207, 236, 108, 250, 47, 100];

/**
 * Creates a _Init_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 */
export function createInitInstruction(
  accounts: InitInstructionAccounts,
  args: InitInstructionArgs
) {
  const { authority, fanout, holdingAccount, membershipMint } = accounts;

  const [data] = initStruct.serialize({
    instructionDiscriminator: initInstructionDiscriminator,
    ...args,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: authority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: fanout,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: holdingAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: membershipMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: web3.SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ];

  const ix = new web3.TransactionInstruction({
    programId: new web3.PublicKey(
      "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
    ),
    keys,
    data,
  });
  return ix;
}
