import * as beet from "@metaplex-foundation/beet";
export type AddMemberArgs = {
  voucherBumpSeed: number;
  shares: beet.bignum;
};
export const addMemberArgsStruct = new beet.BeetArgsStruct<AddMemberArgs>(
  [
    ["voucherBumpSeed", beet.u8],
    ["shares", beet.u64],
  ],
  "AddMemberArgs"
);
