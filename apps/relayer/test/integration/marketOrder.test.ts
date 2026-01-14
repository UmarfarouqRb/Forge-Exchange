
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { saveOrder, getOrders, Order } from '@forge/db';
import { http, createWalletClient, publicActions, parseUnits, getContract, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';
import { artifacts } from '../util/artifacts';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

beforeEach(async () => {
    await supabase.from('orders').delete().neq('id', '0');
});

describe('Relayer Integration Tests: Market Order Execution', () => {

  it('should successfully save a market order to the database', async () => {
    const order: Order = {
        id: '2',
        user: 'test_user_market',
        pair: 'TEST/USD',
        side: 'buy',
        type: 'market',
        price: '100',
        amount: '2',
        filled: '0',
        status: 'open',
        createdAt: new Date().toISOString(),
        symbol: 'TEST/USD',
        total: '200',
        leverage: '1',
    };

    await saveOrder(order);

    const orders = await getOrders('test_user_market');
    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('2');
  });

  it('should successfully execute a market order on the IntentSpotRouter contract', async () => {
    const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
    const client = createWalletClient({
      account,
      chain: anvil,
      transport: http('http://127.0.0.1:8545')
    }).extend(publicActions);

    const user = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
    const tokenInAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const tokenOutAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619';
    const amountIn = parseUnits('1', 6);

    const hash = await client.deployContract({
      abi: artifacts.IntentSpotRouter.abi,
      bytecode: artifacts.IntentSpotRouter.bytecode as Hex,
      args: [
        artifacts.addresses.VaultSpot,
        artifacts.addresses.FeeController,
        'IntentSpotRouter',
        '1'
      ]
    });
    const receipt = await client.getTransactionReceipt({ hash });
    const contractAddress = receipt.contractAddress;

    if (!contractAddress) {
        throw new Error('Contract address not found');
    }

    await client.writeContract({
      address: tokenInAddress as Hex,
      abi: [{ type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
      functionName: 'approve',
      args: [contractAddress, amountIn]
    });

    const swapIntent = {
        user: user.address,
        tokenIn: tokenInAddress as Hex,
        tokenOut: tokenOutAddress as Hex,
        amountIn: amountIn,
        minAmountOut: 0n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        nonce: 1n,
        adapter: '0x0000000000000000000000000000000000000000'
    };

    const domain = {
        name: 'IntentSpotRouter',
        version: '1',
        chainId: anvil.id,
        verifyingContract: contractAddress
    };

    const types = {
        SwapIntent: [
            { name: 'user', type: 'address' },
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'adapter', type: 'address' }
        ]
    };

    const signature = await client.signTypedData({
        domain: domain,
        types: types,
        primaryType: 'SwapIntent',
        message: swapIntent
    });
    
    const tx = await client.writeContract({
      address: contractAddress,
      abi: artifacts.IntentSpotRouter.abi,
      functionName: 'executeSwap',
      args: [swapIntent, signature]
    });
    
    const receipt2 = await client.waitForTransactionReceipt({ hash: tx });
    expect(receipt2.status).toBe('success');

  });
});
