---
sidebar_position: 1
---

# What is Hydra

Hydra is a wallet of wallets. A fanout wallet if your will. It allows the creation of extremely large membership sets that can take part in fund distribution from a central wallet. It works with SOL and any SPL token.
![](/img/fanout.jpg)

## Basic flow
An "Authority" which could be you , your friend or even Shaq.sol can make a Hydra wallet. When you create a Hydra you need to give it a name, this name is GLOBALLY unique. It is encouraged but not required to give your Hydra a fun name to give it some personality.
A Hydra will have is configuration account and its `native holding account`. This native holding account is where all the money goes. After you have made this `parent` Hydra for the native SOL currency you can make a child Hydra ( a little baby Hydra)
 for any SPL token. This means your Fanout `native holding account` can accept any fungible SPL token on its ATA of that mint. 
When you make a Hydra for the first time you need to select the membership model, this is how the Program determines who is getting the distribution.

## Membership Models
Hydra supports three membership modes currently:

1. Wallet
2. NFT
3. Token
