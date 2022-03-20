import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, NATIVE_MINT } from './../constants.mjs';
import { createCreateNativeMintInstruction } from './../instructions/index.mjs';
/**
 * Create native mint
 *
 * @param connection               Connection to use
 * @param payer                    Payer of the transaction and initialization fees
 * @param confirmOptions           Options for confirming the transaction
 * @param programId                SPL Token program account
 * @param nativeMint               Native mint id associated with program
 */
export async function createNativeMint(connection, payer, confirmOptions, programId = TOKEN_PROGRAM_ID, nativeMint = NATIVE_MINT) {
    const transaction = new Transaction().add(createCreateNativeMintInstruction(payer.publicKey, programId, nativeMint));
    await sendAndConfirmTransaction(connection, transaction, [payer], confirmOptions);
}
//# sourceMappingURL=createNativeMint.js.map