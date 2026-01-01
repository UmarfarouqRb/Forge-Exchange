/// <reference types="vite/client" />

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { PrivyProvider } from "@privy-io/react-auth";
import { ChainProvider } from "@/contexts/ChainContext";
import { MarketDataProvider } from '@/contexts/MarketDataProvider';
import { base, bsc, arbitrum } from 'viem/chains';
import App from './App';
import './index.css';

const Root = () => {
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!privyAppId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Privy App ID is not set.</h1>
          <p className="text-muted-foreground">
            Please set the VITE_PRIVY_APP_ID environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={privyAppId}
          config={{
            appearance: {
              theme: 'dark',
              accentColor: '#ff6b00',
            },
            defaultChain: base,
            supportedChains: [base, bsc, arbitrum],
          }}
        >
          <ChainProvider>
            <MarketDataProvider>
              <App />
            </MarketDataProvider>
          </ChainProvider>
        </PrivyProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default Root;