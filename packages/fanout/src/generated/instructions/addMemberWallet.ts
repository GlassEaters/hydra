import * as splToken from "@solana/spl-token";
import * as definedTypes from "../types";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

export type AddMemberWalletInstructionArgs = {
  args: definedTypes.AddMemberArgs;
};
const addMemberWalletStruct = new beet.BeetArgsStruct<
  AddMemberWalletInstructionArgs & {
    instructionDiscriminator: number[];
  }
>(
  [
    ["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["args", definedTypes.addMemberArgsStruct],
  ],
  "AddMemberWalletInstructionArgs"
);
export type AddMemberWalletInstructionAccounts = {
  authority: web3.PublicKey;
  account: web3.PublicKey;
  fanout: web3.PublicKey;
  membershipAccount: web3.PublicKey;
};

const addMemberWalletInstructionDiscriminator = [
  39, 75, 81, 205, 198, 236, 178, 201,
];

/**
 * Creates a _AddMemberWallet_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 */
export function createAddMemberWalletInstruction(
  accounts: AddMemberWalletInstructionAccounts,
  args: AddMemberWalletInstructionArgs
) {
  const { authority, account, fanout, membershipAccount } = accounts;

  const [data] = addMemberWalletStruct.serialize({
    instructionDiscriminator: addMemberWalletInstructionDiscriminator,
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
