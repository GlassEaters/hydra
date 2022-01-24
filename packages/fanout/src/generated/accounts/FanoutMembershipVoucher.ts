import * as beet from "@metaplex-foundation/beet";
import * as web3 from "@solana/web3.js";
import * as beetSolana from "@metaplex-foundation/beet-solana";

/**
 * Arguments used to create {@link FanoutMembershipVoucherAccountData}
 */
export type FanoutMembershipVoucherAccountDataArgs = {
  totalInflow: beet.bignum;
  lastInflow: beet.bignum;
  amountAtStake: beet.COption<beet.bignum>;
  bumpSeed: number;
  shares: beet.COption<beet.bignum>;
  membershipKey: beet.COption<web3.PublicKey>;
};

const fanoutMembershipVoucherAccountDiscriminator = [
  185, 62, 74, 60, 105, 158, 178, 125,
];
/**
 * Holds the data for the {@link FanoutMembershipVoucherAccount} and provides de/serialization
 * functionality for that data
 */
export class FanoutMembershipVoucherAccountData
  implements FanoutMembershipVoucherAccountDataArgs
{
  private constructor(
    readonly totalInflow: beet.bignum,
    readonly lastInflow: beet.bignum,
    readonly amountAtStake: beet.COption<beet.bignum>,
    readonly bumpSeed: number,
    readonly shares: beet.COption<beet.bignum>,
    readonly membershipKey: beet.COption<web3.PublicKey>
  ) {}

  /**
   * Creates a {@link FanoutMembershipVoucherAccountData} instance from the provided args.
   */
  static fromArgs(args: FanoutMembershipVoucherAccountDataArgs) {
    return new FanoutMembershipVoucherAccountData(
      args.totalInflow,
      args.lastInflow,
      args.amountAtStake,
      args.bumpSeed,
      args.shares,
      args.membershipKey
    );
  }

  /**
   * Deserializes the {@link FanoutMembershipVoucherAccountData} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [FanoutMembershipVoucherAccountData, number] {
    return FanoutMembershipVoucherAccountData.deserialize(
      accountInfo.data,
      offset
    );
  }

  /**
   * Deserializes the {@link FanoutMembershipVoucherAccountData} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(
    buf: Buffer,
    offset = 0
  ): [FanoutMembershipVoucherAccountData, number] {
    return fanoutMembershipVoucherAccountDataStruct.deserialize(buf, offset);
  }

  /**
   * Serializes the {@link FanoutMembershipVoucherAccountData} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return fanoutMembershipVoucherAccountDataStruct.serialize({
      accountDiscriminator: fanoutMembershipVoucherAccountDiscriminator,
      ...this,
    });
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link FanoutMembershipVoucherAccountData} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: FanoutMembershipVoucherAccountDataArgs) {
    const instance = FanoutMembershipVoucherAccountData.fromArgs(args);
    return fanoutMembershipVoucherAccountDataStruct.toFixedFromValue({
      accountDiscriminator: fanoutMembershipVoucherAccountDiscriminator,
      ...instance,
    }).byteSize;
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link FanoutMembershipVoucherAccountData} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: FanoutMembershipVoucherAccountDataArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      FanoutMembershipVoucherAccountData.byteSize(args),
      commitment
    );
  }

  /**
   * Returns a readable version of {@link FanoutMembershipVoucherAccountData} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      totalInflow: this.totalInflow,
      lastInflow: this.lastInflow,
      amountAtStake: this.amountAtStake,
      bumpSeed: this.bumpSeed,
      shares: this.shares,
      membershipKey: this.membershipKey,
    };
  }
}

const fanoutMembershipVoucherAccountDataStruct = new beet.FixableBeetStruct<
  FanoutMembershipVoucherAccountData,
  FanoutMembershipVoucherAccountDataArgs & {
    accountDiscriminator: number[];
  }
>(
  [
    ["accountDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["totalInflow", beet.u64],
    ["lastInflow", beet.u64],
    ["amountAtStake", beet.coption(beet.u64)],
    ["bumpSeed", beet.u8],
    ["shares", beet.coption(beet.u64)],
    ["membershipKey", beet.coption(beetSolana.publicKey)],
  ],
  FanoutMembershipVoucherAccountData.fromArgs,
  "FanoutMembershipVoucherAccountData"
);
