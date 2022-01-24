import * as splToken from "@solana/spl-token";
import * as definedTypes from "../types";
import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";

export type DistributeForNftInstructionArgs = {
  args: definedTypes.DistributeMemberArgs;
};
const distributeForNftStruct = new beet.FixableBeetArgsStruct<
  DistributeForNftInstructionArgs & {
    instructionDiscriminator: number[];
  }
>(
  [
    ["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["args", definedTypes.distributeMemberArgsStruct],
  ],
  "DistributeForNftInstructionArgs"
);
export type DistributeForNftInstructionAccounts = {
  member: web3.PublicKey;
  membershipMintTokenAccount: web3.PublicKey;
  membershipMint: web3.PublicKey;
  membershipAccount: web3.PublicKey;
  fanout: web3.PublicKey;
  holdingAccount: web3.PublicKey;
  fanoutMint: web3.PublicKey;
  fanoutMintMembership: web3.PublicKey;
  mint: web3.PublicKey;
};

const distributeForNftInstructionDiscriminator = [
  30, 135, 142, 146, 247, 7, 149, 116,
];

/**
 * Creates a _DistributeForNft_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 */
export function createDistributeForNftInstruction(
  accounts: DistributeForNftInstructionAccounts,
  args: DistributeForNftInstructionArgs
) {
  const {
    member,
    membershipMintTokenAccount,
    membershipMint,
    membershipAccount,
    fanout,
    holdingAccount,
    fanoutMint,
    fanoutMintMembership,
    mint,
  } = accounts;

  const [data] = distributeForNftStruct.serialize({
    instructionDiscriminator: distributeForNftInstructionDiscriminator,
    ...args,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: member,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: membershipMintTokenAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: membershipMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: membershipAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: fanout,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: holdingAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: fanoutMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: fanoutMintMembership,
      isWritable: false,
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
