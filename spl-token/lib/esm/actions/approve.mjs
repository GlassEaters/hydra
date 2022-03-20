import { sendAndConfirmTransaction, Transaction, } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from './../constants.mjs';
import { createApproveInstruction } from './../instructions/index.mjs';
import { getSigners } from './internal.mjs';
/**
 * Approve a delegate to transfer up to a maximum number of tokens from an account
 *
 * @param connection     Connection to use
 * @param payer          Payer of the transaction fees
 * @param account        Address of the token account
 * @param delegate       Account authorized to transfer tokens from the account
 * @param owner          Owner of the account
 * @param amount         Maximum number of tokens the delegate may transfer
 * @param multiSigners   Signing accounts if `owner` is a multisig
 * @param confirmOptions Options for confirming the transaction
 * @param programId      SPL Token program account
 *
 * @return Signature of the confirmed transaction
 */
export async function approve(connection, payer, account, delegate, owner, amount, multiSigners = [], confirmOptions, programId = TOKEN_PROGRAM_ID) {
    const [ownerPublicKey, signers] = getSigners(owner, multiSigners);
    const transaction = new Transaction().add(createApproveInstruction(account, delegate, ownerPublicKey, amount, multiSigners, programId));
    return await sendAndConfirmTransaction(connection, transaction, [payer, ...signers], confirmOptions);
}
//# sourceMappingURL=approve.js.map