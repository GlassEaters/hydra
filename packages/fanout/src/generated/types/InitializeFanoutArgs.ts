import * as beet from "@metaplex-foundation/beet";
export type InitializeFanoutArgs = {
  bumpSeed: number;
  nativeAccountBumpSeed: number;
  name: string;
  totalShares: beet.bignum;
};
export const initializeFanoutArgsStruct =
  new beet.FixableBeetArgsStruct<InitializeFanoutArgs>(
    [
      ["bumpSeed", beet.u8],
      ["nativeAccountBumpSeed", beet.u8],
      ["name", beet.utf8String],
      ["totalShares", beet.u64],
    ],
    "InitializeFanoutArgs"
  );
