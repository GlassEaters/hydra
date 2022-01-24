import * as splToken from "@solana/spl-token";
import * as definedTypes from "../types";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

export type AddMemberTokenInstructionArgs = {
  args: definedTypes.AddMemberArgs;
};
const addMemberTokenStruct = new beet.BeetArgsStruct<
  AddMemberTokenInstructionArgs & {
    instructionDiscriminator: number[];
  }
>(
  [
    ["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["args", definedTypes.addMemberArgsStruct],
  ],
  "AddMemberTokenInstructionArgs"
);
export type AddMemberTokenInstructionAccounts = {
  authority: web3.PublicKey;
  membershipKey: web3.PublicKey;
  membershipMintTokenAccount: web3.PublicKey;
  fanout: web3.PublicKey;
  membershipMint: web3.PublicKey;
};

const addMemberTokenInstructionDiscriminator = [
  112, 66, 32, 13, 38, 195, 88, 18,
];

/**
 * Creates a _AddMemberToken_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 */
export function createAddMemberTokenInstruction(
  accounts: AddMemberTokenInstructionAccounts,
  args: AddMemberTokenInstructionArgs
) {
  const {
    authority,
    membershipKey,
    membershipMintTokenAccount,
    fanout,
    membershipMint,
  } = accounts;

  const [data] = addMemberTokenStruct.serialize({
    instructionDiscriminator: addMemberTokenInstructionDiscriminator,
    ...args,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: authority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: membershipKey,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: membershipMintTokenAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: fanout,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: membershipMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: web3.SystemProgram.programId,
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
