import { struct, u8 } from '@solana/buffer-layout';
import { publicKey } from '@solana/buffer-layout-utils';
import { PublicKey, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from './../constants.mjs';
import { TokenInvalidInstructionDataError, TokenInvalidInstructionKeysError, TokenInvalidInstructionProgramError, TokenInvalidInstructionTypeError, } from './../errors.mjs';
import { TokenInstruction } from './types.mjs';
/** TODO: docs */
export const initializeMintInstructionData = struct([
    u8('instruction'),
    u8('decimals'),
    publicKey('mintAuthority'),
    u8('freezeAuthorityOption'),
    publicKey('freezeAuthority'),
]);
/**
 * Construct an InitializeMint instruction
 *
 * @param mint            Token mint account
 * @param decimals        Number of decimals in token account amounts
 * @param mintAuthority   Minting authority
 * @param freezeAuthority Optional authority that can freeze token accounts
 * @param programId       SPL Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createInitializeMintInstruction(mint, decimals, mintAuthority, freezeAuthority, programId = TOKEN_PROGRAM_ID) {
    const keys = [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(initializeMintInstructionData.span);
    initializeMintInstructionData.encode({
        instruction: TokenInstruction.InitializeMint,
        decimals,
        mintAuthority,
        freezeAuthorityOption: freezeAuthority ? 1 : 0,
        freezeAuthority: freezeAuthority || new PublicKey(0),
    }, data);
    return new TransactionInstruction({ keys, programId, data });
}
/**
 * Decode an InitializeMint instruction and validate it
 *
 * @param instruction Transaction instruction to decode
 * @param programId   SPL Token program account
 *
 * @return Decoded, valid instruction
 */
export function decodeInitializeMintInstruction(instruction, programId = TOKEN_PROGRAM_ID) {
    if (!instruction.programId.equals(programId))
        throw new TokenInvalidInstructionProgramError();
    if (instruction.data.length !== initializeMintInstructionData.span)
        throw new TokenInvalidInstructionDataError();
    const { keys: { mint, rent }, data, } = decodeInitializeMintInstructionUnchecked(instruction);
    if (data.instruction !== TokenInstruction.InitializeMint)
        throw new TokenInvalidInstructionTypeError();
    if (!mint || !rent)
        throw new TokenInvalidInstructionKeysError();
    // TODO: key checks?
    return {
        programId,
        keys: {
            mint,
            rent,
        },
        data,
    };
}
/**
 * Decode an InitializeMint instruction without validating it
 *
 * @param instruction Transaction instruction to decode
 *
 * @return Decoded, non-validated instruction
 */
export function decodeInitializeMintInstructionUnchecked({ programId, keys: [mint, rent], data, }) {
    const { instruction, decimals, mintAuthority, freezeAuthorityOption, freezeAuthority } = initializeMintInstructionData.decode(data);
    return {
        programId,
        keys: {
            mint,
            rent,
        },
        data: {
            instruction,
            decimals,
            mintAuthority,
            freezeAuthority: freezeAuthorityOption ? freezeAuthority : null,
        },
    };
}
//# sourceMappingURL=initializeMint.js.map