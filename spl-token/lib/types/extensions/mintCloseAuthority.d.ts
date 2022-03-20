import { PublicKey } from '@solana/web3.js';
import { Mint } from '../state/mint';
/** MintCloseAuthority as stored by the program */
export interface MintCloseAuthority {
    closeAuthority: PublicKey;
}
/** Buffer layout for de/serializing a mint */
export declare const MintCloseAuthorityLayout: import("@solana/buffer-layout").Structure<MintCloseAuthority>;
export declare const MINT_CLOSE_AUTHORITY_SIZE: number;
export declare function getMintCloseAuthority(mint: Mint): MintCloseAuthority | null;
