/** Instructions defined by the program */
export var TokenInstruction;
(function (TokenInstruction) {
    TokenInstruction[TokenInstruction["InitializeMint"] = 0] = "InitializeMint";
    TokenInstruction[TokenInstruction["InitializeAccount"] = 1] = "InitializeAccount";
    TokenInstruction[TokenInstruction["InitializeMultisig"] = 2] = "InitializeMultisig";
    TokenInstruction[TokenInstruction["Transfer"] = 3] = "Transfer";
    TokenInstruction[TokenInstruction["Approve"] = 4] = "Approve";
    TokenInstruction[TokenInstruction["Revoke"] = 5] = "Revoke";
    TokenInstruction[TokenInstruction["SetAuthority"] = 6] = "SetAuthority";
    TokenInstruction[TokenInstruction["MintTo"] = 7] = "MintTo";
    TokenInstruction[TokenInstruction["Burn"] = 8] = "Burn";
    TokenInstruction[TokenInstruction["CloseAccount"] = 9] = "CloseAccount";
    TokenInstruction[TokenInstruction["FreezeAccount"] = 10] = "FreezeAccount";
    TokenInstruction[TokenInstruction["ThawAccount"] = 11] = "ThawAccount";
    TokenInstruction[TokenInstruction["TransferChecked"] = 12] = "TransferChecked";
    TokenInstruction[TokenInstruction["ApproveChecked"] = 13] = "ApproveChecked";
    TokenInstruction[TokenInstruction["MintToChecked"] = 14] = "MintToChecked";
    TokenInstruction[TokenInstruction["BurnChecked"] = 15] = "BurnChecked";
    TokenInstruction[TokenInstruction["InitializeAccount2"] = 16] = "InitializeAccount2";
    TokenInstruction[TokenInstruction["SyncNative"] = 17] = "SyncNative";
    TokenInstruction[TokenInstruction["InitializeAccount3"] = 18] = "InitializeAccount3";
    TokenInstruction[TokenInstruction["InitializeMultisig2"] = 19] = "InitializeMultisig2";
    TokenInstruction[TokenInstruction["InitializeMint2"] = 20] = "InitializeMint2";
    TokenInstruction[TokenInstruction["GetAccountDataSize"] = 21] = "GetAccountDataSize";
    TokenInstruction[TokenInstruction["InitializeImmutableOwner"] = 22] = "InitializeImmutableOwner";
    TokenInstruction[TokenInstruction["AmountToUiAmount"] = 23] = "AmountToUiAmount";
    TokenInstruction[TokenInstruction["UiAmountToAmount"] = 24] = "UiAmountToAmount";
    TokenInstruction[TokenInstruction["InitializeMintCloseAuthority"] = 25] = "InitializeMintCloseAuthority";
    TokenInstruction[TokenInstruction["TransferFeeExtension"] = 26] = "TransferFeeExtension";
    TokenInstruction[TokenInstruction["ConfidentialTransferExtension"] = 27] = "ConfidentialTransferExtension";
    TokenInstruction[TokenInstruction["DefaultAccountStateExtension"] = 28] = "DefaultAccountStateExtension";
    TokenInstruction[TokenInstruction["Reallocate"] = 29] = "Reallocate";
    TokenInstruction[TokenInstruction["MemoTransferExtension"] = 30] = "MemoTransferExtension";
    TokenInstruction[TokenInstruction["CreateNativeMint"] = 31] = "CreateNativeMint";
})(TokenInstruction || (TokenInstruction = {}));
//# sourceMappingURL=types.js.map