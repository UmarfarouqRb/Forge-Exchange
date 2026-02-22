import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from '@privy-io/wagmi';
import { ChainProvider } from "@/contexts/ChainContext";
import { mainnet, base, bsc, arbitrum } from 'viem/chains';
import App from './App';
import './index.css';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { config } from './wagmi';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = ReactDOM.createRoot(rootElement);

function Main() {
  const { theme } = useThemeContext();

  return (
      <PrivyProvider
        appId={privyAppId!}
        config={{
          appearance: {
            theme: theme,
            accentColor: '#ff6b00',
          },
          defaultChain: base,
          supportedChains: [mainnet, base, bsc, arbitrum],
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <ChainProvider>
              <App />
            </ChainProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
  )
}

root.render(
  <React.StrictMode>
    {!privyAppId ? (
      <div className="flex items-center justify-center h-screen bg-background text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Privy App ID is not set.</h1>
          <p className="text-muted-foreground">
            Please set the VITE_PRIVY_APP_ID environment variable.
          </p>
        </div>
      </div>
    ) : (
      <ThemeProvider>
        <BrowserRouter>
          <Main />
        </BrowserRouter>
      </ThemeProvider>
    )}
  </React.StrictMode>
);
