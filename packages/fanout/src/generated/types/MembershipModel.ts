import * as beet from "@metaplex-foundation/beet";
export enum MembershipModel {
  Wallet ,
  Token,
  NFT,
}
export const membershipModelEnum = beet.fixedScalarEnum(
  MembershipModel
) as beet.FixedSizeBeet<MembershipModel, MembershipModel>;
