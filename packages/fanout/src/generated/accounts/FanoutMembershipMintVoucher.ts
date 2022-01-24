import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";
import * as beetSolana from "@metaplex-foundation/beet-solana";

/**
 * Arguments used to create {@link FanoutMembershipMintVoucherAccountData}
 */
export type FanoutMembershipMintVoucherAccountDataArgs = {
  fanoutMint: web3.PublicKey;
  lastInflow: beet.bignum;
  amountAtStake: beet.COption<beet.bignum>;
  bumpSeed: number;
};

const fanoutMembershipMintVoucherAccountDiscriminator = [
  185, 33, 118, 173, 147, 114, 126, 181,
];
/**
 * Holds the data for the {@link FanoutMembershipMintVoucherAccount} and provides de/serialization
 * functionality for that data
 */
export class FanoutMembershipMintVoucherAccountData
  implements FanoutMembershipMintVoucherAccountDataArgs
{
  private constructor(
    readonly fanoutMint: web3.PublicKey,
    readonly lastInflow: beet.bignum,
    readonly amountAtStake: beet.COption<beet.bignum>,
    readonly bumpSeed: number
  ) {}

  /**
   * Creates a {@link FanoutMembershipMintVoucherAccountData} instance from the provided args.
   */
  static fromArgs(args: FanoutMembershipMintVoucherAccountDataArgs) {
    return new FanoutMembershipMintVoucherAccountData(
      args.fanoutMint,
      args.lastInflow,
      args.amountAtStake,
      args.bumpSeed
    );
  }

  /**
   * Deserializes the {@link FanoutMembershipMintVoucherAccountData} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [FanoutMembershipMintVoucherAccountData, number] {
    return FanoutMembershipMintVoucherAccountData.deserialize(
      accountInfo.data,
      offset
    );
  }

  /**
   * Deserializes the {@link FanoutMembershipMintVoucherAccountData} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(
    buf: Buffer,
    offset = 0
  ): [FanoutMembershipMintVoucherAccountData, number] {
    return fanoutMembershipMintVoucherAccountDataStruct.deserialize(
      buf,
      offset
    );
  }

  /**
   * Serializes the {@link FanoutMembershipMintVoucherAccountData} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return fanoutMembershipMintVoucherAccountDataStruct.serialize({
      accountDiscriminator: fanoutMembershipMintVoucherAccountDiscriminator,
      ...this,
    });
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link FanoutMembershipMintVoucherAccountData} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: FanoutMembershipMintVoucherAccountDataArgs) {
    const instance = FanoutMembershipMintVoucherAccountData.fromArgs(args);
    return fanoutMembershipMintVoucherAccountDataStruct.toFixedFromValue({
      accountDiscriminator: fanoutMembershipMintVoucherAccountDiscriminator,
      ...instance,
    }).byteSize;
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link FanoutMembershipMintVoucherAccountData} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: FanoutMembershipMintVoucherAccountDataArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      FanoutMembershipMintVoucherAccountData.byteSize(args),
      commitment
    );
  }

  /**
   * Returns a readable version of {@link FanoutMembershipMintVoucherAccountData} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      fanoutMint: this.fanoutMint.toBase58(),
      lastInflow: this.lastInflow,
      amountAtStake: this.amountAtStake,
      bumpSeed: this.bumpSeed,
    };
  }
}

const fanoutMembershipMintVoucherAccountDataStruct = new beet.FixableBeetStruct<
  FanoutMembershipMintVoucherAccountData,
  FanoutMembershipMintVoucherAccountDataArgs & {
    accountDiscriminator: number[];
  }
>(
  [
    ["accountDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["fanoutMint", beetSolana.publicKey],
    ["lastInflow", beet.u64],
    ["amountAtStake", beet.coption(beet.u64)],
    ["bumpSeed", beet.u8],
  ],
  FanoutMembershipMintVoucherAccountData.fromArgs,
  "FanoutMembershipMintVoucherAccountData"
);
