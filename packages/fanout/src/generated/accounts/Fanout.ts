import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";
import * as definedTypes from "../types";
import * as beetSolana from "@metaplex-foundation/beet-solana";

/**
 * Arguments used to create {@link FanoutAccountData}
 */
export type FanoutAccountDataArgs = {
  authority: web3.PublicKey;
  name: string;
  account: web3.PublicKey;
  totalShares: beet.bignum;
  totalMembers: number;
  totalInflow: beet.bignum;
  lastSnapshotAmount: beet.bignum;
  bumpSeed: number;
  accountOwnerBumpSeed: number;
  totalAvailableShares: beet.bignum;
  membershipModel: definedTypes.MembershipModel;
  membershipMint: beet.COption<web3.PublicKey>;
  totalStakedShares: beet.COption<beet.bignum>;
};

const fanoutAccountDiscriminator = [164, 101, 210, 92, 222, 14, 75, 156];
/**
 * Holds the data for the {@link FanoutAccount} and provides de/serialization
 * functionality for that data
 */
export class FanoutAccountData implements FanoutAccountDataArgs {
  private constructor(
    readonly authority: web3.PublicKey,
    readonly name: string,
    readonly account: web3.PublicKey,
    readonly totalShares: beet.bignum,
    readonly totalMembers: number,
    readonly totalInflow: beet.bignum,
    readonly lastSnapshotAmount: beet.bignum,
    readonly bumpSeed: number,
    readonly accountOwnerBumpSeed: number,
    readonly totalAvailableShares: beet.bignum,
    readonly membershipModel: definedTypes.MembershipModel,
    readonly membershipMint: beet.COption<web3.PublicKey>,
    readonly totalStakedShares: beet.COption<beet.bignum>
  ) {}

  /**
   * Creates a {@link FanoutAccountData} instance from the provided args.
   */
  static fromArgs(args: FanoutAccountDataArgs) {
    return new FanoutAccountData(
      args.authority,
      args.name,
      args.account,
      args.totalShares,
      args.totalMembers,
      args.totalInflow,
      args.lastSnapshotAmount,
      args.bumpSeed,
      args.accountOwnerBumpSeed,
      args.totalAvailableShares,
      args.membershipModel,
      args.membershipMint,
      args.totalStakedShares
    );
  }

  /**
   * Deserializes the {@link FanoutAccountData} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [FanoutAccountData, number] {
    return FanoutAccountData.deserialize(accountInfo.data, offset);
  }

  /**
   * Deserializes the {@link FanoutAccountData} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [FanoutAccountData, number] {
    return fanoutAccountDataStruct.deserialize(buf, offset);
  }

  /**
   * Serializes the {@link FanoutAccountData} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return fanoutAccountDataStruct.serialize({
      accountDiscriminator: fanoutAccountDiscriminator,
      ...this,
    });
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link FanoutAccountData} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: FanoutAccountDataArgs) {
    const instance = FanoutAccountData.fromArgs(args);
    return fanoutAccountDataStruct.toFixedFromValue({
      accountDiscriminator: fanoutAccountDiscriminator,
      ...instance,
    }).byteSize;
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link FanoutAccountData} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: FanoutAccountDataArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      FanoutAccountData.byteSize(args),
      commitment
    );
  }

  /**
   * Returns a readable version of {@link FanoutAccountData} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      authority: this.authority.toBase58(),
      name: this.name,
      account: this.account.toBase58(),
      totalShares: this.totalShares,
      totalMembers: this.totalMembers,
      totalInflow: this.totalInflow,
      lastSnapshotAmount: this.lastSnapshotAmount,
      bumpSeed: this.bumpSeed,
      accountOwnerBumpSeed: this.accountOwnerBumpSeed,
      totalAvailableShares: this.totalAvailableShares,
      membershipModel: this.membershipModel,
      membershipMint: this.membershipMint,
      totalStakedShares: this.totalStakedShares,
    };
  }
}

const fanoutAccountDataStruct = new beet.FixableBeetStruct<
  FanoutAccountData,
  FanoutAccountDataArgs & {
    accountDiscriminator: number[];
  }
>(
  [
    ["accountDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["authority", beetSolana.publicKey],
    ["name", beet.utf8String],
    ["account", beetSolana.publicKey],
    ["totalShares", beet.u64],
    ["totalMembers", beet.u32],
    ["totalInflow", beet.u64],
    ["lastSnapshotAmount", beet.u64],
    ["bumpSeed", beet.u8],
    ["accountOwnerBumpSeed", beet.u8],
    ["totalAvailableShares", beet.u64],
    ["membershipModel", definedTypes.membershipModelEnum],
    ["membershipMint", beet.coption(beetSolana.publicKey)],
    ["totalStakedShares", beet.coption(beet.u64)],
  ],
  FanoutAccountData.fromArgs,
  "FanoutAccountData"
);
