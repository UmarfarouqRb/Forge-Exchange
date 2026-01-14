
import { useMutation, useQuery } from '@tanstack/react-query';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import { placeOrder, getTokens, PlaceOrderPayload } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { INTENT_SPOT_ROUTER_ADDRESS } from '@/config/contracts';

interface UseSubmitIntentProps {
  symbol: string;
  orderType: 'limit' | 'market';
  side: 'buy' | 'sell';
  price: string;
  currentPrice: string;
  amount: string;
  slippage: string;
}

export function useSubmitIntent() {
  const { wallets } = useWallets();
  const { ready, authenticated } = usePrivy();
  const { toast } = useToast();

  const connectedWallet = wallets[0];
  const isWalletReady = ready && authenticated && !!connectedWallet;

  const { data: tokens } = useQuery<{ [symbol: string]: { address: `0x${string}`; decimals: number } }>({
    queryKey: ['/api/tokens', connectedWallet?.chainId],
    queryFn: () => getTokens(connectedWallet?.chainId?.toString() || '8453'),
    enabled: !!connectedWallet?.chainId,
  });

  return useMutation({
    mutationFn: async (props: UseSubmitIntentProps) => {
      const { symbol, orderType, side, price, currentPrice, amount, slippage } = props;

      if (!isWalletReady || !connectedWallet) throw new Error('Wallet not ready or not connected');
      if (!tokens) throw new Error('Token data not loaded');

      const eip1193Provider = await connectedWallet.getEthereumProvider();
      if (!eip1193Provider) throw new Error('Wallet provider not found');
      const provider = new ethers.BrowserProvider(eip1193Provider);
      const signer = await provider.getSigner();

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const verifyingContract = INTENT_SPOT_ROUTER_ADDRESS[chainId];
      if (!verifyingContract) throw new Error('Unsupported network');

      const [baseAsset, quoteAsset] = symbol.split('/');
      const tokenInSymbol = side === 'buy' ? quoteAsset : baseAsset;
      const tokenOutSymbol = side === 'buy' ? baseAsset : quoteAsset;
      const tokenIn = tokens[tokenInSymbol];
      const tokenOut = tokens[tokenOutSymbol];

      if (!tokenIn || !tokenOut) throw new Error('Token details not found for this pair');

      const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);
      const amountInString = side === 'buy' ? total.toString() : amount;

      let minAmountOut;
      if (orderType === 'market') {
        const slippageTolerance = parseFloat(slippage) / 100;
        if (slippageTolerance < 0 || slippageTolerance > 1) throw new Error('Invalid slippage value');

        const expectedAmountOut = side === 'buy' ? parseFloat(amount || '0') : total;
        const minAmount = expectedAmountOut * (1 - slippageTolerance);
        minAmountOut = ethers.parseUnits(minAmount.toFixed(tokenOut.decimals), tokenOut.decimals).toString();
      } else {
        const limitAmountOut = side === 'buy' ? parseFloat(amount || '0') : total;
        minAmountOut = ethers.parseUnits(limitAmountOut.toFixed(tokenOut.decimals), tokenOut.decimals).toString();
      }

      const intent = {
        user: connectedWallet.address,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: ethers.parseUnits(amountInString, tokenIn.decimals).toString(),
        minAmountOut: minAmountOut,
        deadline: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutes from now
        nonce: BigInt(Date.now()).toString(),
        adapter: ethers.ZeroAddress as `0x${string}`,
        relayerFee: '0',
      };

      const domain = {
        name: 'IntentSpotRouter',
        version: '1',
        chainId: chainId,
        verifyingContract,
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
          { name: 'adapter', type: 'address' },
          { name: 'relayerFee', type: 'uint256' },
        ],
      };

      const signingIntent = {
        ...intent,
        nonce: BigInt(intent.nonce),
        deadline: BigInt(intent.deadline),
      };

      const signature = await signer.signTypedData(domain, types, signingIntent);

      const payload: PlaceOrderPayload = {
        intent: intent,
        signature,
        side: side,
        orderType: orderType,
        price: price,
        amount: amount,
        total: total.toString(),
      };

      return placeOrder(payload);
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Order Placed',
        description: `${variables.side.toUpperCase()} order for ${variables.amount} ${variables.symbol} placed successfully`,
      });
      if (connectedWallet?.address) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', connectedWallet.address] });
      }
    },
    onError: (error: unknown) => {
      let errorMessage = 'Failed to place order';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Order Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
