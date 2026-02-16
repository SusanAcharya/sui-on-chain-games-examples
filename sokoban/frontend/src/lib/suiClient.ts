import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

export const suiClient = new SuiJsonRpcClient({
    network: 'testnet',
    url: getJsonRpcFullnodeUrl('testnet'),
});
