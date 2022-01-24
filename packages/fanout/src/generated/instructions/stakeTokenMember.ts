import * as splToken from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

const stakeTokenMemberStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[];
}>(
  [["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)]],
  "StakeTokenMemberInstructionArgs"
);
export type StakeTokenMemberInstructionAccounts = {
  signer: web3.PublicKey;
  fanout: web3.PublicKey;
  membershipAccount: web3.PublicKey;
  membershipMint: web3.PublicKey;
};

const stakeTokenMemberInstructionDiscriminator = [
  13, 162, 107, 72, 54, 84, 26, 168,
];

/**
 * Creates a _StakeTokenMember_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 */
export function createStakeTokenMemberInstruction(
  accounts: StakeTokenMemberInstructionAccounts
) {
  const { signer, fanout, membershipAccount, membershipMint } = accounts;

  const [data] = stakeTokenMemberStruct.serialize({
    instructionDiscriminator: stakeTokenMemberInstructionDiscriminator,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: signer,
      isWritable: false,
      isSigner: true,
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
