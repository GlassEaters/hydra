"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreateNativeMintInstruction = exports.createNativeMintInstructionData = void 0;
const buffer_layout_1 = require("@solana/buffer-layout");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const types_1 = require("./types");
/** TODO: docs */
exports.createNativeMintInstructionData = (0, buffer_layout_1.struct)([(0, buffer_layout_1.u8)('instruction')]);
/**
 * Construct a CreateNativeMint instruction
 *
 * @param account   New token account
 * @param mint      Mint account
 * @param owner     Owner of the new account
 * @param programId SPL Token program account
 *
 * @return Instruction to add to a transaction
 */
function createCreateNativeMintInstruction(payer, programId = constants_1.TOKEN_PROGRAM_ID, nativeMintId = constants_1.NATIVE_MINT) {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: nativeMintId, isSigner: false, isWritable: true },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(exports.createNativeMintInstructionData.span);
    exports.createNativeMintInstructionData.encode({ instruction: types_1.TokenInstruction.CreateNativeMint }, data);
    return new web3_js_1.TransactionInstruction({ keys, programId, data });
}
exports.createCreateNativeMintInstruction = createCreateNativeMintInstruction;
//# sourceMappingURL=createNativeMint.js.map