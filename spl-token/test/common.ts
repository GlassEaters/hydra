import { PublicKey, Keypair, Connection, Signer } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '../src';

export async function newAccountWithLamports(connection: Connection, lamports = 1000000): Promise<Signer> {
    const account = Keypair.generate();
    const signature = await connection.requestAirdrop(account.publicKey, lamports);
    await connection.confirmTransaction(signature);
    return account;
}

export async function getConnection(): Promise<Connection> {
    const url = 'http://localhost:8899';
    const connection = new Connection(url, 'confirmed');
    await connection.getVersion();
    return connection;
}

export const TEST_PROGRAM_ID = process.env.TEST_PROGRAM_ID
    ? new PublicKey(process.env.TEST_PROGRAM_ID)
    : TOKEN_PROGRAM_ID;
