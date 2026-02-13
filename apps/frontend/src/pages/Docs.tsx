
import React, { useState } from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-muted p-4 rounded-md my-4 overflow-x-auto">
    <code className="text-sm font-mono text-muted-foreground">{children}</code>
  </pre>
);

const Step: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="text-muted-foreground mb-2">{children}</li>
);

const Docs: React.FC = () => {
  const [openSections, setOpenSections] = useState<string[]>(['user-guide']);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [id]
    );
  };

  const sections = {
    'user-guide': {
      title: 'User Guide',
      content: (
        <>
          <p className="mb-6 text-muted-foreground">
            Forge is a professional CEX-style decentralized cryptocurrency exchange with multi-chain support. Users can trade crypto without KYC by connecting their Email, Socials or Web3 wallet (e.g., MetaMask). The platform features a modern user interface for easy interaction and trade based on intent trading, TradingView integration for live market data, and full mobile responsiveness.
          </p>
          <h3 className="text-xl font-bold mb-3 text-foreground">Getting Started</h3>
          <ol className="list-decimal list-inside space-y-3">
            <Step><strong>Connect Your Wallet</strong>: Click the "Connect Wallet" button and approve the connection in your MetaMask wallet.</Step>
            <Step><strong>Select a Chain</strong>: Use the dropdown menu to select your desired blockchain network.</Step>
            <Step><strong>Explore the Platform</strong>: Navigate between the Home, Market, Spot, Futures, and Assets pages.</Step>
          </ol>
        </>
      ),
    },
    'depositing': {
        title: 'How to Deposit',
        content: (
            <ol className="list-decimal list-inside space-y-3">
                <Step>Navigate to the <strong className="text-foreground">Assets</strong> page.</Step>
                <Step>Click the <strong className="text-foreground">Deposit</strong> button.</Step>
                <Step>Select the asset you wish to deposit.</Step>
                <Step>Enter the amount you want to deposit.</Step>
                <Step>Click <strong className="text-foreground">Deposit</strong> and confirm the transaction in your wallet.</Step>
            </ol>
        ),
    },
    'trading': {
      title: 'How to Trade',
      content: (
        <ol className="list-decimal list-inside space-y-3">
            <Step>Navigate to the <strong className="text-foreground">Spot</strong> or <strong className="text-foreground">Futures</strong> page.</Step>
            <Step>Select the trading pair you want to trade.</Step>
            <Step>Choose between a <strong className="text-foreground">Limit</strong> or <strong className="text-foreground">Market</strong> order.</Step>
            <Step>Enter the amount you want to trade.</Step>
            <Step>Click <strong className="text-foreground">Buy</strong> or <strong className="text-foreground">Sell</strong> to place your order.</Step>
        </ol>
      ),
    },
    'withdrawing': {
        title: 'How to Withdraw',
        content: (
            <ol className="list-decimal list-inside space-y-3">
                <Step>Navigate to the <strong className="text-foreground">Assets</strong> page.</Step>
                <Step>Click the <strong className="text-foreground">Withdraw</strong> button.</Step>
                <Step>Select the asset you wish to withdraw.</Step>
                <Step>Enter the amount you want to withdraw.</Step>
                <Step>Click <strong className="text-foreground">Withdraw</strong> and confirm the transaction in your wallet.</Step>
            </ol>
        ),
    },
    'developer-guide': {
      title: 'Developer Guide',
      content: <p className="text-muted-foreground">This guide provides instructions for developers who want to build on top of or contribute to the Forge Exchange.</p>,
    },
    'tech-stack': {
      title: 'Tech Stack',
      content: (
        <ul className="list-disc list-inside space-y-3 text-muted-foreground">
          <li><strong className="text-foreground">Frontend</strong>: React 18 with TypeScript, Vite, TanStack Query, Shadcn UI, Tailwind CSS, Recharts, ethers.js, TradingView widgets, Lucide React icons.</li>
          <li><strong className="text-foreground">Backend</strong>: Node.js/Express, Drizzle ORM, in-memory storage.</li>
          <li><strong className="text-foreground">Smart Contracts</strong>: Solidity, Foundry.</li>
        </ul>
      ),
    },
    'getting-started-dev': {
      title: 'Getting Started for Developers',
      content: (
        <ol className="list-decimal list-inside space-y-3">
          <Step><strong>Prerequisites</strong>: Node.js (v18+), pnpm, and Foundry.</Step>
          <Step><strong>Installation</strong>:
            <CodeBlock>git clone &lt;YOUR_REPOSITORY_URL&gt;\ncd forge-exchange\npnpm install</CodeBlock>
          </Step>
          <Step><strong>Supabase Setup</strong>: Create a <code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">.env</code> file in <code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">packages/database</code> with your Supabase credentials.</Step>
          <Step><strong>Run the Environment</strong>:
            <CodeBlock># Terminal 1: Start the Local Blockchain\npnpm run chain\n\n# Terminal 2: Start the Backend Relayer\npnpm run dev:relayer\n\n# Terminal 3: Start the Frontend Application\npnpm run dev:frontend</CodeBlock>
          </Step>
        </ol>
      ),
    },
    'smart-contracts': {
        title: 'Smart Contracts',
        content: (
            <div className="text-muted-foreground">
                <h3 className="text-xl font-bold mb-3 text-foreground">VaultSpot.sol</h3>
                <p className="mb-4">The central custody and accounting contract. It holds all user assets in a non-custodial manner, tracking individual balances through a direct 1-to-1 internal ledger.</p>
                <h3 className="text-xl font-bold mb-3 text-foreground">IntentSpotRouter.sol</h3>
                <p>A gas-less swap router for processing off-chain signed intents. It enables a gas-less experience for the end-user, as a third-party "relayer" can submit the transaction on their behalf.</p>
            </div>
        ),
    },
    'the-relayer': {
        title: 'The Relayer',
        content: <p className="text-muted-foreground">The relayer is a trust-minimized executor that submits signed intents to the <code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">IntentSpotRouter</code> for on-chain execution. It is responsible for receiving and matching user intents, executing them against various decentralized exchanges (DEXs), and ensuring that users get the best possible price for their trades.</p>,
    },
    'api-endpoints': {
      title: 'API Endpoints',
      content: (
          <ul className="list-disc list-inside space-y-2">
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">POST /api/spot</code>: Proxied to the relayer for spot trades.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">POST /api/session/authorize</code>: Proxied to the relayer for user authorization.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /health</code>: Health check.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">POST /api/broadcast</code>: Broadcasts messages to clients via WebSocket.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">POST /api/orders</code>: Creates a new order.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/orders/:account</code>: Retrieves orders for a specific account.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/markets/:id</code>: Retrieves market state by ID.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/markets/by-symbol/:symbol</code>: Retrieves market state by symbol.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/trading-pairs</code>: Retrieves all trading pairs.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/trading-pairs/by-symbol/:symbol</code>: Retrieves a trading pair by symbol.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/trading-pairs/trending</code>: Retrieves trending trading pairs.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/tokens</code>: Retrieves all tokens.</li>
              <li className="text-muted-foreground"><code className="font-mono text-sm bg-muted text-muted-foreground p-1 rounded-md">GET /api/vault/tokens</code>: Retrieves tokens from the vault.</li>
          </ul>
      ),
  },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto p-4 md:p-8">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Forge Exchange Documentation</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                Welcome to the official documentation for Forge Exchange, a high-performance, decentralized exchange (DEX) platform.
                </p>
            </header>

            <div className="space-y-4">
                {Object.entries(sections).map(([id, { title, content }]) => (
                <div key={id} className="border border-border rounded-lg overflow-hidden">
                    <button
                    onClick={() => toggleSection(id)}
                    className="w-full text-left p-4 bg-muted/50 hover:bg-muted/80 transition-colors duration-200 flex justify-between items-center"
                    >
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                     <svg className={`w-5 h-5 text-muted-foreground transform transition-transform ${openSections.includes(id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    {openSections.includes(id) && (
                    <div className="p-6 bg-card">
                        {content}
                    </div>
                    )}
                </div>
                ))}
            </div>

            <footer className="text-center mt-12 text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Forge.inc. All rights reserved.</p>
                <div className="flex justify-center space-x-4 mt-4">
                    <a href="https://twitter.com/forge" target="_blank" rel="noopener noreferrer">Twitter</a>
                    <a href="https://discord.gg/forge" target="_blank" rel="noopener noreferrer">Discord</a>
                    <a href="mailto:contact@forge.inc">Contact Us</a>
                </div>
            </footer>
        </div>
    </div>
  );
};

export default Docs;
