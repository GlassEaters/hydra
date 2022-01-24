import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";
import * as beetSolana from "@metaplex-foundation/beet-solana";

/**
 * Arguments used to create {@link FanoutMintAccountData}
 */
export type FanoutMintAccountDataArgs = {
  mint: web3.PublicKey;
  fanout: web3.PublicKey;
  tokenAccount: web3.PublicKey;
  totalInflow: beet.bignum;
  lastSnapshotAmount: beet.bignum;
  bumpSeed: number;
};

const fanoutMintAccountDiscriminator = [50, 164, 42, 108, 90, 201, 250, 216];
/**
 * Holds the data for the {@link FanoutMintAccount} and provides de/serialization
 * functionality for that data
 */
export class FanoutMintAccountData implements FanoutMintAccountDataArgs {
  private constructor(
    readonly mint: web3.PublicKey,
    readonly fanout: web3.PublicKey,
    readonly tokenAccount: web3.PublicKey,
    readonly totalInflow: beet.bignum,
    readonly lastSnapshotAmount: beet.bignum,
    readonly bumpSeed: number
  ) {}

  /**
   * Creates a {@link FanoutMintAccountData} instance from the provided args.
   */
  static fromArgs(args: FanoutMintAccountDataArgs) {
    return new FanoutMintAccountData(
      args.mint,
      args.fanout,
      args.tokenAccount,
      args.totalInflow,
      args.lastSnapshotAmount,
      args.bumpSeed
    );
  }

  /**
   * Deserializes the {@link FanoutMintAccountData} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [FanoutMintAccountData, number] {
    return FanoutMintAccountData.deserialize(accountInfo.data, offset);
  }

  /**
   * Deserializes the {@link FanoutMintAccountData} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [FanoutMintAccountData, number] {
    return fanoutMintAccountDataStruct.deserialize(buf, offset);
  }

  /**
   * Serializes the {@link FanoutMintAccountData} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return fanoutMintAccountDataStruct.serialize({
      accountDiscriminator: fanoutMintAccountDiscriminator,
      ...this,
    });
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link FanoutMintAccountData}
   */
  static get byteSize() {
    return fanoutMintAccountDataStruct.byteSize;
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link FanoutMintAccountData} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      FanoutMintAccountData.byteSize,
      commitment
    );
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link FanoutMintAccountData} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === FanoutMintAccountData.byteSize;
  }

  /**
   * Returns a readable version of {@link FanoutMintAccountData} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      mint: this.mint.toBase58(),
      fanout: this.fanout.toBase58(),
      tokenAccount: this.tokenAccount.toBase58(),
      totalInflow: this.totalInflow,
      lastSnapshotAmount: this.lastSnapshotAmount,
      bumpSeed: this.bumpSeed,
    };
  }
}

const fanoutMintAccountDataStruct = new beet.BeetStruct<
  FanoutMintAccountData,
  FanoutMintAccountDataArgs & {
    accountDiscriminator: number[];
  }
>(
  [
    ["accountDiscriminator", beet.uniformFixedSizeArray(beet.u8, 8)],
    ["mint", beetSolana.publicKey],
    ["fanout", beetSolana.publicKey],
    ["tokenAccount", beetSolana.publicKey],
    ["totalInflow", beet.u64],
    ["lastSnapshotAmount", beet.u64],
    ["bumpSeed", beet.u8],
  ],
  FanoutMintAccountData.fromArgs,
  "FanoutMintAccountData"
);
