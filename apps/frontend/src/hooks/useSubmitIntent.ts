
import { useMutation } from '@tanstack/react-query';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import { placeOrder, getTokens } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { INTENT_SPOT_ROUTER_ADDRESS } from '@/lib/contracts';
import { useWallet } from '@/contexts/WalletContext';
import { useQuery } from '@tanstack/react-query';

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
  const { wallet } = useWallet();
  const { wallets } = useWallets();
  const { ready, authenticated } = usePrivy();
  const { toast } = useToast();

  const isWalletReady = ready && authenticated && wallets.length > 0;

  const { data: tokens } = useQuery<{ [symbol: string]: { address: `0x${string}`; decimals: number } }>({
    queryKey: ['/api/tokens', wallet.chainId],
    queryFn: () => getTokens(wallet.chainId?.toString() || '8453'),
    enabled: !!wallet.chainId,
  });

  return useMutation({
    mutationFn: async (props: UseSubmitIntentProps) => {
      const { symbol, orderType, side, price, currentPrice, amount, slippage } = props;

      const connectedWallet = wallets[0];
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
      const quoteToken = tokens[quoteAsset];

      if (!tokenIn || !tokenOut || !quoteToken) throw new Error('Token details not found for this pair');

      const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);
      const amountInString = side === 'buy' ? total.toString() : amount;

      let amountOutMin = '0';
      if (orderType === 'market') {
        const slippageTolerance = parseFloat(slippage) / 100;
        if (slippageTolerance < 0 || slippageTolerance > 1) throw new Error('Invalid slippage value');

        const expectedAmountOut = side === 'buy' ? parseFloat(amount || '0') : total;
        const minAmount = expectedAmountOut * (1 - slippageTolerance);
        amountOutMin = ethers.parseUnits(minAmount.toFixed(tokenOut.decimals), tokenOut.decimals).toString();
      }

      const intent = {
        user: connectedWallet.address,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: ethers.parseUnits(amountInString, tokenIn.decimals).toString(),
        price: orderType === 'limit' ? ethers.parseUnits(price, quoteToken.decimals).toString() : '0',
        amountOutMin: amountOutMin,
        nonce: Date.now(),
      };

      const domain = {
        name: 'IntentSpotRouter',
        version: '1',
        chainId: chainId,
        verifyingContract,
      };

      const types = {
        Intent: [
          { name: 'user', type: 'address' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const signature = await signer.signTypedData(domain, types, intent);

      return placeOrder({ intent, signature });
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Order Placed',
        description: `${variables.side.toUpperCase()} order for ${variables.amount} ${variables.symbol} placed successfully`,
      });
      if (wallet.address) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', wallet.address] });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order',
        variant: 'destructive',
      });
    },
  });
}
