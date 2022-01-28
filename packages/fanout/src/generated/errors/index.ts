type ErrorWithCode = Error & { code: number };
type MaybeErrorWithCode = ErrorWithCode | null | undefined;

const createErrorFromCodeLookup: Map<number, () => ErrorWithCode> = new Map();
const createErrorFromNameLookup: Map<string, () => ErrorWithCode> = new Map();

/**
 * BadArtithmetic: 'Encountered an arithmetic error'
 */
export class BadArtithmeticError extends Error {
  readonly code: number = 0x1770;
  readonly name: string = "BadArtithmetic";
  constructor() {
    super("Encountered an arithmetic error");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, BadArtithmeticError);
    }
  }
}

createErrorFromCodeLookup.set(0x1770, () => new BadArtithmeticError());
createErrorFromNameLookup.set(
  "BadArtithmetic",
  () => new BadArtithmeticError()
);

/**
 * InvalidAuthority: 'Invalid authority'
 */
export class InvalidAuthorityError extends Error {
  readonly code: number = 0x1771;
  readonly name: string = "InvalidAuthority";
  constructor() {
    super("Invalid authority");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, InvalidAuthorityError);
    }
  }
}

createErrorFromCodeLookup.set(0x1771, () => new InvalidAuthorityError());
createErrorFromNameLookup.set(
  "InvalidAuthority",
  () => new InvalidAuthorityError()
);

/**
 * InsufficientShares: 'Not Enough Available Shares'
 */
export class InsufficientSharesError extends Error {
  readonly code: number = 0x1772;
  readonly name: string = "InsufficientShares";
  constructor() {
    super("Not Enough Available Shares");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, InsufficientSharesError);
    }
  }
}

createErrorFromCodeLookup.set(0x1772, () => new InsufficientSharesError());
createErrorFromNameLookup.set(
  "InsufficientShares",
  () => new InsufficientSharesError()
);

/**
 * SharesArentAtMax: 'All available shares must be assigned to a member'
 */
export class SharesArentAtMaxError extends Error {
  readonly code: number = 0x1773;
  readonly name: string = "SharesArentAtMax";
  constructor() {
    super("All available shares must be assigned to a member");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, SharesArentAtMaxError);
    }
  }
}

createErrorFromCodeLookup.set(0x1773, () => new SharesArentAtMaxError());
createErrorFromNameLookup.set(
  "SharesArentAtMax",
  () => new SharesArentAtMaxError()
);

/**
 * NewMintAccountRequired: 'A New mint account must be provided'
 */
export class NewMintAccountRequiredError extends Error {
  readonly code: number = 0x1774;
  readonly name: string = "NewMintAccountRequired";
  constructor() {
    super("A New mint account must be provided");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, NewMintAccountRequiredError);
    }
  }
}

createErrorFromCodeLookup.set(0x1774, () => new NewMintAccountRequiredError());
createErrorFromNameLookup.set(
  "NewMintAccountRequired",
  () => new NewMintAccountRequiredError()
);

/**
 * MintAccountRequired: 'A Token type Fanout requires a Membership Mint'
 */
export class MintAccountRequiredError extends Error {
  readonly code: number = 0x1775;
  readonly name: string = "MintAccountRequired";
  constructor() {
    super("A Token type Fanout requires a Membership Mint");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, MintAccountRequiredError);
    }
  }
}

createErrorFromCodeLookup.set(0x1775, () => new MintAccountRequiredError());
createErrorFromNameLookup.set(
  "MintAccountRequired",
  () => new MintAccountRequiredError()
);

/**
 * InvalidMembershipModel: 'Invalid Membership Model'
 */
export class InvalidMembershipModelError extends Error {
  readonly code: number = 0x1776;
  readonly name: string = "InvalidMembershipModel";
  constructor() {
    super("Invalid Membership Model");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, InvalidMembershipModelError);
    }
  }
}

createErrorFromCodeLookup.set(0x1776, () => new InvalidMembershipModelError());
createErrorFromNameLookup.set(
  "InvalidMembershipModel",
  () => new InvalidMembershipModelError()
);

/**
 * InvalidMembershipVoucher: 'Invalid Membership Voucher'
 */
export class InvalidMembershipVoucherError extends Error {
  readonly code: number = 0x1777;
  readonly name: string = "InvalidMembershipVoucher";
  constructor() {
    super("Invalid Membership Voucher");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, InvalidMembershipVoucherError);
    }
  }
}

createErrorFromCodeLookup.set(
  0x1777,
  () => new InvalidMembershipVoucherError()
);
createErrorFromNameLookup.set(
  "InvalidMembershipVoucher",
  () => new InvalidMembershipVoucherError()
);

/**
 * MintDoesNotMatch: 'Invalid Mint for the config'
 */
export class MintDoesNotMatchError extends Error {
  readonly code: number = 0x1778;
  readonly name: string = "MintDoesNotMatch";
  constructor() {
    super("Invalid Mint for the config");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, MintDoesNotMatchError);
    }
  }
}

createErrorFromCodeLookup.set(0x1778, () => new MintDoesNotMatchError());
createErrorFromNameLookup.set(
  "MintDoesNotMatch",
  () => new MintDoesNotMatchError()
);

/**
 * InvalidHoldingAccount: 'Holding account does not match the config'
 */
export class InvalidHoldingAccountError extends Error {
  readonly code: number = 0x1779;
  readonly name: string = "InvalidHoldingAccount";
  constructor() {
    super("Holding account does not match the config");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, InvalidHoldingAccountError);
    }
  }
}

createErrorFromCodeLookup.set(0x1779, () => new InvalidHoldingAccountError());
createErrorFromNameLookup.set(
  "InvalidHoldingAccount",
  () => new InvalidHoldingAccountError()
);

/**
 * HoldingAccountMustBeAnATA: 'A Mint holding account must be an ata for the mint owned by the config'
 */
export class HoldingAccountMustBeAnATAError extends Error {
  readonly code: number = 0x177a;
  readonly name: string = "HoldingAccountMustBeAnATA";
  constructor() {
    super(
      "A Mint holding account must be an ata for the mint owned by the config"
    );
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, HoldingAccountMustBeAnATAError);
    }
  }
}

createErrorFromCodeLookup.set(
  0x177a,
  () => new HoldingAccountMustBeAnATAError()
);
createErrorFromNameLookup.set(
  "HoldingAccountMustBeAnATA",
  () => new HoldingAccountMustBeAnATAError()
);

/**
 * DerivedKeyInvalid: ''
 */
export class DerivedKeyInvalidError extends Error {
  readonly code: number = 0x177b;
  readonly name: string = "DerivedKeyInvalid";
  constructor() {
    super("");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, DerivedKeyInvalidError);
    }
  }
}

createErrorFromCodeLookup.set(0x177b, () => new DerivedKeyInvalidError());
createErrorFromNameLookup.set(
  "DerivedKeyInvalid",
  () => new DerivedKeyInvalidError()
);

/**
 * IncorrectOwner: ''
 */
export class IncorrectOwnerError extends Error {
  readonly code: number = 0x177c;
  readonly name: string = "IncorrectOwner";
  constructor() {
    super("");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, IncorrectOwnerError);
    }
  }
}

createErrorFromCodeLookup.set(0x177c, () => new IncorrectOwnerError());
createErrorFromNameLookup.set(
  "IncorrectOwner",
  () => new IncorrectOwnerError()
);

/**
 * WalletDoesNotOwnMembershipToken: 'Wallet Does not Own Membership Token'
 */
export class WalletDoesNotOwnMembershipTokenError extends Error {
  readonly code: number = 0x177d;
  readonly name: string = "WalletDoesNotOwnMembershipToken";
  constructor() {
    super("Wallet Does not Own Membership Token");
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, WalletDoesNotOwnMembershipTokenError);
    }
  }
}

createErrorFromCodeLookup.set(
  0x177d,
  () => new WalletDoesNotOwnMembershipTokenError()
);
createErrorFromNameLookup.set(
  "WalletDoesNotOwnMembershipToken",
  () => new WalletDoesNotOwnMembershipTokenError()
);

/**
 * Attempts to resolve a custom program error from the provided error code.
 */
export function errorFromCode(code: number): MaybeErrorWithCode {
  const createError = createErrorFromCodeLookup.get(code);
  return createError != null ? createError() : null;
}

/**
 * Attempts to resolve a custom program error from the provided error name, i.e. 'Unauthorized'.
 */
export function errorFromName(name: string): MaybeErrorWithCode {
  const createError = createErrorFromNameLookup.get(name);
  return createError != null ? createError() : null;
}
