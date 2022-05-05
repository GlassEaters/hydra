import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  //Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Wallet of Wallets",
    description: (
      <>
        Create a huge wallet with tons of members, sign NFTs and let unlimited
        of people get a piece of royalties
      </>
    ),
  },
  {
    title: "NFT Membership Utility",
    description: (
      <>Add your NFTs to a Hydra and stream sale royalties to your HodLers</>
    ),
  },
  {
    title: "Token Membership",
    description: (
      <>
        Easy Staking rewards for people who hold and stake your token that is
        connected to a Hydra
      </>
    ),
  },
  {
    title: "Tokenized Royalties",
    description: (
      <>
        Easily transfer or sell portions of Royalty streams tied to a Hydra
        Wallet Address
      </>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center"></div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
