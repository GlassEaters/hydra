import { IdlAccounts, Idl } from '@project-serum/anchor';
export const FanoutIDLJson: Idl & { metadata?: { address: string } } = {
  "version": "0.0.0",
  "name": "fanout",
  "instructions": [
    {
      "name": "initializeFanoutV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "fanout",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "account",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "InitializeFanoutV0Args"
          }
        }
      ]
    },
    {
      "name": "stakeV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "fanout",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voucher",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voucherAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "fanoutAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "freezeAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bumpSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "unstakeV0",
      "accounts": [
        {
          "name": "refund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fanout",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voucher",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "account",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "freezeAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "distributeV0",
      "accounts": [
        {
          "name": "fanout",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voucher",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fanoutAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "FanoutV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "totalShares",
            "type": "u64"
          },
          {
            "name": "totalInflow",
            "type": "u128"
          },
          {
            "name": "lastBalance",
            "type": "u64"
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          },
          {
            "name": "freezeAuthorityBumpSeed",
            "type": "u8"
          },
          {
            "name": "accountOwnerBumpSeed",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "FanoutVoucherV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fanout",
            "type": "publicKey"
          },
          {
            "name": "account",
            "type": "publicKey"
          },
          {
            "name": "destination",
            "type": "publicKey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "inflowAtStake",
            "type": "u128"
          },
          {
            "name": "lastInflow",
            "type": "u128"
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeFanoutV0Args",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bumpSeed",
            "type": "u8"
          },
          {
            "name": "freezeAuthorityBumpSeed",
            "type": "u8"
          },
          {
            "name": "accountOwnerBumpSeed",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 300,
      "name": "BadArtithmetic",
      "msg": "Encountered an arithmetic error"
    },
    {
      "code": 301,
      "name": "InvalidAuthority",
      "msg": "Invalid authority"
    }
  ],
  "metadata": {
    "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
  }
};
export type FanoutIDL = {"version":"0.0.0","name":"fanout","instructions":[{"name":"initializeFanoutV0","accounts":[{"name":"payer","isMut":true,"isSigner":true},{"name":"fanout","isMut":true,"isSigner":false},{"name":"mint","isMut":false,"isSigner":false},{"name":"account","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"args","type":{"defined":"InitializeFanoutV0Args"}}]},{"name":"stakeV0","accounts":[{"name":"payer","isMut":true,"isSigner":true},{"name":"fanout","isMut":true,"isSigner":false},{"name":"voucher","isMut":true,"isSigner":false},{"name":"voucherAccount","isMut":true,"isSigner":false},{"name":"destination","isMut":false,"isSigner":false},{"name":"fanoutAccount","isMut":false,"isSigner":false},{"name":"mint","isMut":false,"isSigner":false},{"name":"freezeAuthority","isMut":false,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bumpSeed","type":"u8"}]},{"name":"unstakeV0","accounts":[{"name":"refund","isMut":true,"isSigner":false},{"name":"fanout","isMut":false,"isSigner":false},{"name":"voucher","isMut":true,"isSigner":false},{"name":"account","isMut":false,"isSigner":false},{"name":"owner","isMut":false,"isSigner":true},{"name":"mint","isMut":false,"isSigner":false},{"name":"freezeAuthority","isMut":false,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[]},{"name":"distributeV0","accounts":[{"name":"fanout","isMut":true,"isSigner":false},{"name":"voucher","isMut":true,"isSigner":false},{"name":"fanoutAccount","isMut":true,"isSigner":false},{"name":"owner","isMut":false,"isSigner":false},{"name":"destination","isMut":true,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false}],"args":[]}],"accounts":[{"name":"fanoutV0","type":{"kind":"struct","fields":[{"name":"account","type":"publicKey"},{"name":"mint","type":"publicKey"},{"name":"totalShares","type":"u64"},{"name":"totalInflow","type":"u128"},{"name":"lastBalance","type":"u64"},{"name":"bumpSeed","type":"u8"},{"name":"freezeAuthorityBumpSeed","type":"u8"},{"name":"accountOwnerBumpSeed","type":"u8"}]}},{"name":"fanoutVoucherV0","type":{"kind":"struct","fields":[{"name":"fanout","type":"publicKey"},{"name":"account","type":"publicKey"},{"name":"destination","type":"publicKey"},{"name":"shares","type":"u64"},{"name":"inflowAtStake","type":"u128"},{"name":"lastInflow","type":"u128"},{"name":"bumpSeed","type":"u8"}]}}],"types":[{"name":"InitializeFanoutV0Args","type":{"kind":"struct","fields":[{"name":"bumpSeed","type":"u8"},{"name":"freezeAuthorityBumpSeed","type":"u8"},{"name":"accountOwnerBumpSeed","type":"u8"}]}}],"errors":[{"code":300,"name":"BadArtithmetic","msg":"Encountered an arithmetic error"},{"code":301,"name":"InvalidAuthority","msg":"Invalid authority"}],"metadata":{"address":"Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"}};



  

export type FanoutV0 = IdlAccounts<FanoutIDL>["fanoutV0"]

export type FanoutVoucherV0 = IdlAccounts<FanoutIDL>["fanoutVoucherV0"]
  
          