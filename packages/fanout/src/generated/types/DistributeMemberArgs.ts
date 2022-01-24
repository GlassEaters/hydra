import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";
import * as beetSolana from "@metaplex-foundation/beet-solana";
export type DistributeMemberArgs = {
  mint: beet.COption<web3.PublicKey>;
  mintFanoutMembershipBump: number;
};
export const distributeMemberArgsStruct =
  new beet.FixableBeetArgsStruct<DistributeMemberArgs>(
    [
      ["mint", beet.coption(beetSolana.publicKey)],
      ["mintFanoutMembershipBump", beet.u8],
    ],
    "DistributeMemberArgs"
  );
