import * as beet from "@metaplex-foundation/beet";
import * as web3 from "@solana/web3.js";

export type InitForMintInstructionArgs = {
  bumpSeed: number;
};
const initForMintStruct = new beet.BeetArgsStruct<
  InitForMintInstructionArgs & {
    instructionDiscriminator: number[];
  }
>(
  [
    ["instructionDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["bumpSeed", beet.u8],
  ],
  "InitForMintInstructionArgs"
);
export type InitForMintInstructionAccounts = {
  authority: web3.PublicKey;
  fanout: web3.PublicKey;
  fanoutForMint: web3.PublicKey;
  mintHoldingAccount: web3.PublicKey;
  mint: web3.PublicKey;
};

const initForMintInstructionDiscriminator = [
  253, 163, 24, 48, 21, 100, 189, 235,
];

/**
 * Creates a _InitForMint_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 */
export function createInitForMintInstruction(
  accounts: InitForMintInstructionAccounts,
  args: InitForMintInstructionArgs
) {
  const { authority, fanout, fanoutForMint, mintHoldingAccount, mint } =
    accounts;

  const [data] = initForMintStruct.serialize({
    instructionDiscriminator: initForMintInstructionDiscriminator,
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
      pubkey: fanoutForMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: mintHoldingAccount,
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
