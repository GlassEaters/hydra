import * as splToken from "@solana/spl-token";
import * as definedTypes from "../types";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

export type AddMemberNftInstructionArgs = {
  args: definedTypes.AddMemberArgs;
};
const addMemberNftStruct = new beet.BeetArgsStruct<
  AddMemberNftInstructionArgs & {
    instructionDiscriminator: number[];
  }
>(
  [
    ["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["args", definedTypes.addMemberArgsStruct],
  ],
  "AddMemberNftInstructionArgs"
);
export type AddMemberNftInstructionAccounts = {
  authority: web3.PublicKey;
  account: web3.PublicKey;
  fanout: web3.PublicKey;
  membershipAccount: web3.PublicKey;
  mint: web3.PublicKey;
};

const addMemberNftInstructionDiscriminator = [
  3, 226, 147, 250, 104, 209, 52, 226,
];

/**
 * Creates a _AddMemberNft_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 */
export function createAddMemberNftInstruction(
  accounts: AddMemberNftInstructionAccounts,
  args: AddMemberNftInstructionArgs
) {
  const { authority, account, fanout, membershipAccount, mint } = accounts;

  const [data] = addMemberNftStruct.serialize({
    instructionDiscriminator: addMemberNftInstructionDiscriminator,
    ...args,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: authority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: account,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: fanout,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: membershipAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: mint,
      isWritable: false,
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
