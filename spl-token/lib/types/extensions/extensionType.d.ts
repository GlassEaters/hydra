/// <reference types="node" />
import { Mint } from '../state/mint';
export declare enum ExtensionType {
    Uninitialized = 0,
    TransferFeeConfig = 1,
    TransferFeeAmount = 2,
    MintCloseAuthority = 3,
    ConfidentialTransferMint = 4,
    ConfidentialTransferAccount = 5,
    DefaultAccountState = 6,
    ImmutableOwner = 7,
    MemoTransfer = 8
}
export declare const TYPE_SIZE = 2;
export declare const LENGTH_SIZE = 2;
export declare function getTypeLen(e: ExtensionType): number;
export declare function getAccountTypeOfMintType(e: ExtensionType): ExtensionType;
export declare function getMintLen(extensionTypes: ExtensionType[]): number;
export declare function getAccountLen(extensionTypes: ExtensionType[]): number;
export declare function getExtensionData(extension: ExtensionType, tlvData: Buffer): Buffer | null;
export declare function getExtensionTypes(tlvData: Buffer): ExtensionType[];
export declare function getAccountLenForMint(mint: Mint): number;
