
// apps/api/src/orders.ts
import { Request, Response } from 'express'
import { verifyTypedData, createPublicClient, http, keccak256 } from 'viem'
import { base } from 'viem/chains'
import { Order, saveOrder, getOrders as getOrdersFromDb } from '@forge/db'
import { ERC20ABI } from './abis/erc20';
import { relayerConfig } from '@forge/common'

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
})

export async function addOrder(req: Request, res: Response) {
    const { intent, signature, orderType } = req.body

    const domain = {
        name: 'IntentSpotRouter',
        version: '1',
        chainId: base.id,
        verifyingContract: intent.verifyingContract,
    }

    const types = {
        SwapIntent: [
            { name: "user", type: "address" },
            { name: "tokenIn", type: "address" },
            { name: "tokenOut", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "minAmountOut", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "adapter", type: "address" },
            { name: "relayerFee", type: "uint256" },
        ],
    }

    const valid = await verifyTypedData({
        address: intent.user,
        domain,
        types,
        primaryType: 'SwapIntent',
        message: intent,
        signature,
    })

    if (!valid) {
        return res.status(400).json({ error: 'Invalid signature' })
    }

    const balance = await publicClient.readContract({
        address: intent.tokenIn,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [intent.user],
    }) as bigint

    if (balance < intent.amountIn) {
        return res.status(400).json({ error: 'Insufficient funds' })
    }

    const order: Order = {
        id: keccak256(signature),
        ...intent,
    }

    await saveOrder(order);

    // forward to relayer
    fetch(`${relayerConfig.relayerUrl}/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent, signature, orderType }),
    });

    res.status(201).json(order)
}

export async function getOrders(req: Request, res: Response) {
    const { address } = req.params
    if (typeof address !== 'string') {
        return res.status(400).json({ error: 'Address parameter is required' })
    }

    const orders = await getOrdersFromDb(address)
    res.json(orders)
}

