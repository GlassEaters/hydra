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
exports.getMinimumBalanceForRentExemptAccountWithExtensions = exports.getMinimumBalanceForRentExemptAccount = exports.getMultipleAccounts = exports.getAccount = exports.ACCOUNT_SIZE = exports.AccountLayout = exports.AccountState = void 0;
const buffer_layout_1 = require("@solana/buffer-layout");
const buffer_layout_utils_1 = require("@solana/buffer-layout-utils");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const multisig_1 = require("./multisig");
const accountType_1 = require("../extensions/accountType");
const extensionType_1 = require("../extensions/extensionType");
/** Token account state as stored by the program */
var AccountState;
(function (AccountState) {
    AccountState[AccountState["Uninitialized"] = 0] = "Uninitialized";
    AccountState[AccountState["Initialized"] = 1] = "Initialized";
    AccountState[AccountState["Frozen"] = 2] = "Frozen";
})(AccountState = exports.AccountState || (exports.AccountState = {}));
/** Buffer layout for de/serializing a token account */
exports.AccountLayout = (0, buffer_layout_1.struct)([
    (0, buffer_layout_utils_1.publicKey)('mint'),
    (0, buffer_layout_utils_1.publicKey)('owner'),
    (0, buffer_layout_utils_1.u64)('amount'),
    (0, buffer_layout_1.u32)('delegateOption'),
    (0, buffer_layout_utils_1.publicKey)('delegate'),
    (0, buffer_layout_1.u8)('state'),
    (0, buffer_layout_1.u32)('isNativeOption'),
    (0, buffer_layout_utils_1.u64)('isNative'),
    (0, buffer_layout_utils_1.u64)('delegatedAmount'),
    (0, buffer_layout_1.u32)('closeAuthorityOption'),
    (0, buffer_layout_utils_1.publicKey)('closeAuthority'),
]);
/** Byte length of a token account */
exports.ACCOUNT_SIZE = exports.AccountLayout.span;
/**
 * Retrieve information about a token account
 *
 * @param connection Connection to use
 * @param address    Token account
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
function getAccount(connection, address, commitment, programId = constants_1.TOKEN_PROGRAM_ID) {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield connection.getAccountInfo(address, commitment);
        return unpackAccount(info, address, programId);
    });
}
exports.getAccount = getAccount;
/**
 * Retrieve information about multiple token accounts in a single RPC call
 *
 * @param connection Connection to use
 * @param addresses  Token accounts
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
function getMultipleAccounts(connection, addresses, commitment, programId = constants_1.TOKEN_PROGRAM_ID) {
    return __awaiter(this, void 0, void 0, function* () {
        const infos = yield connection.getMultipleAccountsInfo(addresses, commitment);
        const accounts = [];
        for (let i = 0; i < infos.length; i++) {
            const account = unpackAccount(infos[i], addresses[i], programId);
            accounts.push(account);
        }
        return accounts;
    });
}
exports.getMultipleAccounts = getMultipleAccounts;
/** Get the minimum lamport balance for a base token account to be rent exempt
 *
 * @param connection Connection to use
 * @param commitment Desired level of commitment for querying the state
 *
 * @return Amount of lamports required
 */
function getMinimumBalanceForRentExemptAccount(connection, commitment) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield getMinimumBalanceForRentExemptAccountWithExtensions(connection, [], commitment);
    });
}
exports.getMinimumBalanceForRentExemptAccount = getMinimumBalanceForRentExemptAccount;
/** Get the minimum lamport balance for a rent-exempt token account with extensions
 *
 * @param connection Connection to use
 * @param commitment Desired level of commitment for querying the state
 *
 * @return Amount of lamports required
 */
function getMinimumBalanceForRentExemptAccountWithExtensions(connection, extensions, commitment) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountLen = (0, extensionType_1.getAccountLen)(extensions);
        return yield connection.getMinimumBalanceForRentExemption(accountLen, commitment);
    });
}
exports.getMinimumBalanceForRentExemptAccountWithExtensions = getMinimumBalanceForRentExemptAccountWithExtensions;
function unpackAccount(info, address, programId) {
    if (!info)
        throw new errors_1.TokenAccountNotFoundError();
    if (!info.owner.equals(programId))
        throw new errors_1.TokenInvalidAccountOwnerError();
    if (info.data.length < exports.ACCOUNT_SIZE)
        throw new errors_1.TokenInvalidAccountSizeError();
    const rawAccount = exports.AccountLayout.decode(info.data.slice(0, exports.ACCOUNT_SIZE));
    let tlvData = Buffer.alloc(0);
    if (info.data.length > exports.ACCOUNT_SIZE) {
        if (info.data.length === multisig_1.MULTISIG_SIZE)
            throw new errors_1.TokenInvalidAccountSizeError();
        if (info.data[exports.ACCOUNT_SIZE] != accountType_1.AccountType.Account)
            throw new errors_1.TokenInvalidAccountError();
        tlvData = info.data.slice(exports.ACCOUNT_SIZE + accountType_1.ACCOUNT_TYPE_SIZE);
    }
    return {
        address,
        mint: rawAccount.mint,
        owner: rawAccount.owner,
        amount: rawAccount.amount,
        delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
        delegatedAmount: rawAccount.delegatedAmount,
        isInitialized: rawAccount.state !== AccountState.Uninitialized,
        isFrozen: rawAccount.state === AccountState.Frozen,
        isNative: !!rawAccount.isNativeOption,
        rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
        closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
        tlvData,
    };
}
//# sourceMappingURL=account.js.map