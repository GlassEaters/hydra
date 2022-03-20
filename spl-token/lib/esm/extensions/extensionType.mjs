import { ACCOUNT_SIZE } from './../state/account.mjs';
import { MINT_SIZE } from './../state/mint.mjs';
import { MULTISIG_SIZE } from './../state/multisig.mjs';
import { ACCOUNT_TYPE_SIZE } from './accountType.mjs';
import { MINT_CLOSE_AUTHORITY_SIZE } from './mintCloseAuthority.mjs';
export var ExtensionType;
(function (ExtensionType) {
    ExtensionType[ExtensionType["Uninitialized"] = 0] = "Uninitialized";
    ExtensionType[ExtensionType["TransferFeeConfig"] = 1] = "TransferFeeConfig";
    ExtensionType[ExtensionType["TransferFeeAmount"] = 2] = "TransferFeeAmount";
    ExtensionType[ExtensionType["MintCloseAuthority"] = 3] = "MintCloseAuthority";
    ExtensionType[ExtensionType["ConfidentialTransferMint"] = 4] = "ConfidentialTransferMint";
    ExtensionType[ExtensionType["ConfidentialTransferAccount"] = 5] = "ConfidentialTransferAccount";
    ExtensionType[ExtensionType["DefaultAccountState"] = 6] = "DefaultAccountState";
    ExtensionType[ExtensionType["ImmutableOwner"] = 7] = "ImmutableOwner";
    ExtensionType[ExtensionType["MemoTransfer"] = 8] = "MemoTransfer";
})(ExtensionType || (ExtensionType = {}));
export const TYPE_SIZE = 2;
export const LENGTH_SIZE = 2;
// NOTE: All of these should eventually use their type's Span instead of these
// constants.  This is provided for at least creation to work.
export function getTypeLen(e) {
    switch (e) {
        case ExtensionType.Uninitialized:
            return 0;
        case ExtensionType.TransferFeeConfig:
            return 108;
        case ExtensionType.TransferFeeAmount:
            return 8;
        case ExtensionType.MintCloseAuthority:
            return MINT_CLOSE_AUTHORITY_SIZE;
        case ExtensionType.ConfidentialTransferMint:
            return 97;
        case ExtensionType.ConfidentialTransferAccount:
            return 286;
        case ExtensionType.DefaultAccountState:
            return 1;
        case ExtensionType.ImmutableOwner:
            return 0;
        case ExtensionType.MemoTransfer:
            return 1;
        default:
            throw Error(`Unknown extension type: ${e}`);
    }
}
export function getAccountTypeOfMintType(e) {
    switch (e) {
        case ExtensionType.TransferFeeConfig:
            return ExtensionType.TransferFeeAmount;
        case ExtensionType.ConfidentialTransferMint:
            return ExtensionType.ConfidentialTransferAccount;
        case ExtensionType.TransferFeeAmount:
        case ExtensionType.ConfidentialTransferAccount:
        case ExtensionType.DefaultAccountState:
        case ExtensionType.ImmutableOwner:
        case ExtensionType.MemoTransfer:
        case ExtensionType.MintCloseAuthority:
        case ExtensionType.Uninitialized:
            return ExtensionType.Uninitialized;
    }
}
function getLen(extensionTypes, baseSize) {
    if (extensionTypes.length === 0) {
        return baseSize;
    }
    else {
        const accountLength = ACCOUNT_SIZE +
            ACCOUNT_TYPE_SIZE +
            extensionTypes
                .filter((element, i) => i === extensionTypes.indexOf(element))
                .map((element) => getTypeLen(element) + TYPE_SIZE + LENGTH_SIZE)
                .reduce((a, b) => a + b);
        if (accountLength === MULTISIG_SIZE) {
            return accountLength + TYPE_SIZE;
        }
        else {
            return accountLength;
        }
    }
}
export function getMintLen(extensionTypes) {
    return getLen(extensionTypes, MINT_SIZE);
}
export function getAccountLen(extensionTypes) {
    return getLen(extensionTypes, ACCOUNT_SIZE);
}
export function getExtensionData(extension, tlvData) {
    let extensionTypeIndex = 0;
    while (extensionTypeIndex < tlvData.length) {
        const entryType = tlvData.readUInt16LE(extensionTypeIndex);
        const entryLength = tlvData.readUInt16LE(extensionTypeIndex + TYPE_SIZE);
        const typeIndex = extensionTypeIndex + TYPE_SIZE + LENGTH_SIZE;
        if (entryType == extension) {
            return tlvData.slice(typeIndex, typeIndex + entryLength);
        }
        extensionTypeIndex = typeIndex + entryLength;
    }
    return null;
}
export function getExtensionTypes(tlvData) {
    const extensionTypes = [];
    let extensionTypeIndex = 0;
    while (extensionTypeIndex < tlvData.length) {
        const entryType = tlvData.readUInt16LE(extensionTypeIndex);
        extensionTypes.push(entryType);
        const entryLength = tlvData.readUInt16LE(extensionTypeIndex + TYPE_SIZE);
        extensionTypeIndex += TYPE_SIZE + LENGTH_SIZE + entryLength;
    }
    return extensionTypes;
}
export function getAccountLenForMint(mint) {
    const extensionTypes = getExtensionTypes(mint.tlvData);
    const accountExtensions = extensionTypes.map(getAccountTypeOfMintType);
    return getAccountLen(accountExtensions);
}
//# sourceMappingURL=extensionType.js.map