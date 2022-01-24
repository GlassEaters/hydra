import * as splToken from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

const unstakeTokenMemberStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[];
}>(
  [["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)]],
  "UnstakeTokenMemberInstructionArgs"
);
export type UnstakeTokenMemberInstructionAccounts = {
  authority: web3.PublicKey;
  account: web3.PublicKey;
  fanout: web3.PublicKey;
  membershipAccount: web3.PublicKey;
  mint: web3.PublicKey;
};

const unstakeTokenMemberInstructionDiscriminator = [
  150, 119, 2, 172, 75, 25, 9, 117,
];

/**
 * Creates a _UnstakeTokenMember_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 */
export function createUnstakeTokenMemberInstruction(
  accounts: UnstakeTokenMemberInstructionAccounts
) {
  const { authority, account, fanout, membershipAccount, mint } = accounts;

  const [data] = unstakeTokenMemberStruct.serialize({
    instructionDiscriminator: unstakeTokenMemberInstructionDiscriminator,
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
