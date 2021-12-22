export type Fanout = {
  "version": "0.0.0",
  "name": "fanout",
  "instructions": [
    {
      "name": "init",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "fanout",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nativeAccount",
          "isMut": true,
          "isSigner": true
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
            "defined": "InitializeFanoutArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "fanout",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "account",
            "type": "publicKey"
          },
          {
            "name": "totalShares",
            "type": "u32"
          },
          {
            "name": "totalMembers",
            "type": "u32"
          },
          {
            "name": "totalInflow",
            "type": "u128"
          },
          {
            "name": "lastSnapshotAmount",
            "type": "u64"
          },
          {
            "name": "bumpSeed",
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
  "types": [
    {
      "name": "InitializeFanoutArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bumpSeed",
            "type": "u8"
          },
          {
            "name": "nativeAccountBumpSeed",
            "type": "u8"
          },
          {
            "name": "accountOwnerBumpSeed",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "totalShares",
            "type": "u32"
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
  ]
};

export const IDL: Fanout = {
  "version": "0.0.0",
  "name": "fanout",
  "instructions": [
    {
      "name": "init",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "fanout",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nativeAccount",
          "isMut": true,
          "isSigner": true
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
            "defined": "InitializeFanoutArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "fanout",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "account",
            "type": "publicKey"
          },
          {
            "name": "totalShares",
            "type": "u32"
          },
          {
            "name": "totalMembers",
            "type": "u32"
          },
          {
            "name": "totalInflow",
            "type": "u128"
          },
          {
            "name": "lastSnapshotAmount",
            "type": "u64"
          },
          {
            "name": "bumpSeed",
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
  "types": [
    {
      "name": "InitializeFanoutArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bumpSeed",
            "type": "u8"
          },
          {
            "name": "nativeAccountBumpSeed",
            "type": "u8"
          },
          {
            "name": "accountOwnerBumpSeed",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "totalShares",
            "type": "u32"
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
  ]
};
