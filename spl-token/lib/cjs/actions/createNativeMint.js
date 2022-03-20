"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNativeMint = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const index_1 = require("../instructions/index");
/**
 * Create native mint
 *
 * @param connection               Connection to use
 * @param payer                    Payer of the transaction and initialization fees
 * @param confirmOptions           Options for confirming the transaction
 * @param programId                SPL Token program account
 * @param nativeMint               Native mint id associated with program
 */
function createNativeMint(connection, payer, confirmOptions, programId = constants_1.TOKEN_PROGRAM_ID, nativeMint = constants_1.NATIVE_MINT) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = new web3_js_1.Transaction().add((0, index_1.createCreateNativeMintInstruction)(payer.publicKey, programId, nativeMint));
        yield (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [payer], confirmOptions);
    });
}
exports.createNativeMint = createNativeMint;
//# sourceMappingURL=createNativeMint.js.map