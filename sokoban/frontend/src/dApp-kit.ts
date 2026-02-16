import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
} as const;

export const dAppKit = createDAppKit({
    networks: ['testnet', 'devnet'],
    defaultNetwork: 'testnet',
    enableBurnerWallet: import.meta.env.DEV,
    createClient(network) {
        return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
    },
});

declare module '@mysten/dapp-kit-core' {
    interface Register {
        dAppKit: typeof dAppKit;
    }
}
