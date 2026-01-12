import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * A reusable component for displaying a block of code.
 * @param {{ children: React.ReactNode }}
 */
const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-gray-800/50 p-4 rounded-md my-2 overflow-x-auto">
    <code className="text-sm font-mono text-white">{children}</code>
  </pre>
);

/**
 * A reusable component for a documentation section.
 * @param {{ title: string, children: React.ReactNode }}
 */
const DocSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold mb-4 text-primary-foreground bg-gradient-to-r from-[hsl(27,87%,61%)] to-[hsl(214,66%,54%)] bg-clip-text text-transparent">{title}</h2>
    {children}
  </div>
);

/**
 * The main documentation page for Forge Exchange.
 * This page is divided into two main sections: a User Guide and a Developer Guide.
 */
const Docs: React.FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-8 text-foreground">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Forge Exchange Documentation</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Welcome to the official documentation for Forge Exchange, a high-performance, decentralized exchange (DEX) platform.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">User Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DocSection title="Introduction to Forge Exchange">
              <p>
                Forge is a professional CEX-style decentralized cryptocurrency exchange with multi-chain support. Users can trade crypto without KYC by connecting their Web3 wallet (e.g., MetaMask). The platform features a modern dark theme with gradient accents, TradingView integration for live market data, and full mobile responsiveness.
              </p>
            </DocSection>

            <DocSection title="Getting Started">
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Connect Your Wallet</strong>: Click the "Connect Wallet" button and approve the connection in your MetaMask wallet.</li>
                <li><strong>Select a Chain</strong>: Use the dropdown menu to select your desired blockchain network.</li>
                <li><strong>Explore the Platform</strong>: Navigate between the Home, Market, Spot, Futures, and Assets pages.</li>
              </ol>
            </DocSection>

            <DocSection title="Trading">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Spot Trading</strong>: Instantly buy or sell cryptocurrencies at the current market price.</li>
                <li><strong>Limit Orders</strong>: Place orders to buy or sell at a specific price.</li>
                <li><strong>Futures Trading</strong>: Trade perpetual contracts with leverage.</li>
              </ul>
            </DocSection>

            <DocSection title="Assets">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>View Your Balances</strong>: See an overview of your token balances.</li>
                <li><strong>Deposit and Withdraw</strong>: Transfer funds to and from the exchange.</li>
                <li><strong>Transaction History</strong>: Track the status of your deposits, withdrawals, and trades.</li>
              </ul>
            </DocSection>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Developer Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DocSection title="Introduction">
              <p>
                This guide provides a technical overview of the Forge Exchange architecture, including the smart contracts, relayer, and frontend.
              </p>
            </DocSection>

            <DocSection title="Getting Started">
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Prerequisites</strong>: Node.js (v18+), pnpm, and Foundry.</li>
                <li><strong>Installation</strong>: 
                  <CodeBlock>git clone &lt;YOUR_REPOSITORY_URL&gt;\ncd forge-exchange\npnpm install</CodeBlock>
                </li>
                <li><strong>Supabase Setup</strong>: Create a <code>.env</code> file in <code>packages/database</code> with your Supabase credentials.</li>
                <li><strong>Run the Environment</strong>:
                  <CodeBlock># Terminal 1: Start the Local Blockchain\npnpm run chain\n\n# Terminal 2: Start the Backend Relayer\npnpm run dev:relayer\n\n# Terminal 3: Start the Frontend Application\npnpm run dev:frontend</CodeBlock>
                </li>
              </ol>
            </DocSection>

            <DocSection title="Smart Contracts">
              <ul className="list-disc list-inside space-y-2">
                <li><strong><code>VaultSpot.sol</code></strong>: The central custody and accounting contract.</li>
                <li><strong><code>IntentSpotRouter.sol</code></strong>: A gas-less swap router for processing off-chain signed intents.</li>
              </ul>
            </DocSection>

            <DocSection title="The Relayer">
              <p>
                The relayer is a trust-minimized executor that submits signed intents to the <code>IntentSpotRouter</code> for on-chain execution.
              </p>
            </DocSection>

            <DocSection title="Deployment">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Build</strong>: 
                  <CodeBlock>pnpm run build:frontend\npnpm run build:relayer</CodeBlock>
                </li>
                <li><strong>Deploy</strong>: The output in the <code>dist</code> directories is ready for deployment.</li>
              </ul>
            </DocSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Docs;
