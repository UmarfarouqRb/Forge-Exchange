
import { Request, Response } from 'express';
import { createPublicClient, http, getContract, Abi, parseGwei } from 'viem';
import { base } from 'viem/chains';
import { relayerConfig } from '@forge/common';
import IntentSpotRouter_ABI from '../../../../deployment/abi/IntentSpotRouter.json' assert { type: "json" };

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const intentSpotRouterABI = IntentSpotRouter_ABI.abi as Abi;

// Add a buffer to the gas estimate to account for price fluctuations
const GAS_LIMIT_BUFFER = 5000n; 

// Define a tip for the relayer to make a profit
const RELAYER_TIP = parseGwei('0.001'); // 0.001 gwei tip

export const getQuote = async (req: Request, res: Response) => {
  const { tokenIn, tokenOut, amountIn, chainId } = req.body;

  if (!tokenIn || !tokenOut || !amountIn || !chainId) {
    return res.status(400).json({ error: 'Missing required fields: tokenIn, tokenOut, amountIn, chainId' });
  }

  try {
    const network = relayerConfig.getNetworkByChainId(chainId);
    if (!network) {
        return res.status(400).json({ error: `Unsupported chainId: ${chainId}` });
    }

    const client = createPublicClient({
      chain: base, // The relayer currently supports the Base network
      transport: http(network.providerUrl),
    });

    const intentSpotRouterAddress = network.intentSpotRouterAddress as `0x${string}`;
    const intentSpotRouter = getContract({
        address: intentSpotRouterAddress,
        abi: intentSpotRouterABI,
        client,
    });

    // --- Find the Best Price using the IntentSpotRouter's logic ---
    const { result } = await intentSpotRouter.simulate.swap([
        tokenIn,
        tokenOut,
        BigInt(amountIn),
        [], // Let the router find the best path
        '0x'
    ], { account: ZERO_ADDRESS });

    // Explicitly cast the result to a bigint to resolve the type error
    const estimatedAmountOut = result as bigint;

    if (estimatedAmountOut === 0n) {
        return res.status(400).json({ error: 'Could not find a valid quote for the requested token pair.' });
    }

    // --- Estimate Gas Cost for executeSwap ---
    const mockIntent = {
      user: ZERO_ADDRESS,
      tokenIn,
      tokenOut,
      amountIn: BigInt(amountIn),
      minAmountOut: estimatedAmountOut,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), 
      nonce: 0n,
      adapter: ZERO_ADDRESS,
      relayerFee: 0n,
    };
    const mockSignature = '0x';

    const gasEstimate = await client.estimateContractGas({
        address: intentSpotRouterAddress,
        abi: intentSpotRouterABI,
        functionName: 'executeSwap',
        args: [mockIntent, mockSignature],
        account: ZERO_ADDRESS,
    });

    // --- Calculate Relayer Fee ---
    const gasPrice = await client.getGasPrice();
    const totalGasCost = (gasEstimate + GAS_LIMIT_BUFFER) * gasPrice;
    const relayerFee = totalGasCost + RELAYER_TIP;

    // --- Construct the Quote Response ---
    const quote = {
      tokenIn,
      tokenOut,
      amountIn,
      estimatedAmountOut: estimatedAmountOut.toString(),
      relayerFee: relayerFee.toString(),
      adapter: ZERO_ADDRESS,
    };

    res.json(quote);
  } catch (error) {
    console.error('Failed to generate quote:', error);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
};
