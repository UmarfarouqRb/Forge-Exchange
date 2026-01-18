import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SectionHeader from '@/components/SectionHeader';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-gray-800/50 p-4 rounded-md my-2 overflow-x-auto">
    <code className="text-sm font-mono text-white">{children}</code>
  </pre>
);

const Docs: React.FC = () => {
  const sections = [
    { id: 'user-guide', title: 'User Guide' },
    { id: 'introduction', title: 'Introduction' },
    { id: 'getting-started-user', title: 'Getting Started' },
    { id: 'trading', title: 'Trading' },
    { id: 'assets', title: 'Assets' },
    { id: 'developer-guide', title: 'Developer Guide' },
    { id: 'tech-stack', title: 'Tech Stack' },
    { id: 'getting-started-dev', title: 'Getting Started' },
    { id: 'smart-contracts', title: 'Smart Contracts' },
    { id: 'the-relayer', title: 'The Relayer' },
    { id: 'api-endpoints', title: 'API Endpoints' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 text-foreground">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Forge Exchange Documentation</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Welcome to the official documentation for Forge Exchange, a high-performance, decentralized exchange (DEX) platform.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 md:sticky top-24 h-screen">
          <nav className="flex flex-col space-y-2">
            {sections.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="md:col-span-3">
          <Card id="user-guide" className="bg-card border-card-border mb-8">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">User Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader title="Introduction to Forge Exchange">
                <p>
                  Forge is a professional CEX-style decentralized cryptocurrency exchange with multi-chain support. Users can trade crypto without KYC by connecting their Email, Socials or Web3 wallet (e.g., MetaMask). The platform features a modern user interface for easy interaction and trade based on intent trading, TradingView integration for live market data, and full mobile responsiveness.
                </p>
              </SectionHeader>

              <SectionHeader title="Getting Started">
                <ol className="list-decimal list-inside space-y-2">
                  <li><strong>Connect Your Wallet</strong>: Click the "Connect Wallet" button and approve the connection in your MetaMask wallet.</li>
                  <li><strong>Select a Chain</strong>: Use the dropdown menu to select your desired blockchain network.</li>
                  <li><strong>Explore the Platform</strong>: Navigate between the Home, Market, Spot, Futures, and Assets pages.</li>
                </ol>
              </SectionHeader>

              <SectionHeader title="Trading">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Spot Trading</strong>: Instantly buy or sell cryptocurrencies at the current market price.</li>
                  <li><strong>Limit Orders</strong>: Place orders to buy or sell at a specific price.</li>
                  <li><strong>Futures Trading</strong>: Trade perpetual contracts with leverage.</li>
                </ul>
              </SectionHeader>

              <SectionHeader title="Assets">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>View Your Balances</strong>: See an overview of your token balances.</li>
                  <li><strong>Deposit and Withdraw</strong>: Transfer funds to and from the exchange.</li>
                  <li><strong>Transaction History</strong>: Track the status of your deposits, withdrawals, and trades.</li>
                </ul>
              </SectionHeader>
            </CardContent>
          </Card>

          <Card id="developer-guide" className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Developer Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader title="Tech Stack">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Frontend</strong>: React 18 with TypeScript, Vite, TanStack Query, Shadcn UI, Tailwind CSS, Recharts, ethers.js, TradingView widgets, Lucide React icons.</li>
                  <li><strong>Backend</strong>: Node.js/Express, Drizzle ORM, in-memory storage.</li>
                  <li><strong>Smart Contracts</strong>: Solidity, Foundry.</li>
                </ul>
              </SectionHeader>
              <SectionHeader title="Getting Started">
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
              </SectionHeader>

              <SectionHeader title="Smart Contracts">
                <h3 className='text-xl font-bold'>VaultSpot.sol</h3>
                <p>The central custody and accounting contract. It holds all user assets in a non-custodial manner, tracking individual balances through a direct 1-to-1 internal ledger.</p>
                <h3 className='text-xl font-bold'>IntentSpotRouter.sol</h3>
                <p>A gas-less swap router for processing off-chain signed intents. It enables a gas-less experience for the end-user, as a third-party "relayer" can submit the transaction on their behalf.</p>
              </SectionHeader>

              <SectionHeader title="The Relayer">
                <p>
                  The relayer is a trust-minimized executor that submits signed intents to the <code>IntentSpotRouter</code> for on-chain execution. It is responsible for receiving and matching user intents, executing them against various decentralized exchanges (DEXs), and ensuring that users get the best possible price for their trades.
                </p>
              </SectionHeader>

              <SectionHeader title="API Endpoints">
                <ul className="list-disc list-inside space-y-2">
                  <li><code>POST /api/session/authorize</code>: Authorizes a user\'s session.</li>
                  <li><code>GET /api/orders/:address</code>: Retrieves orders for a specific user.</li>
                  <li><code>POST /api/orders</code>: Submits a new order.</li>
                  <li><code>POST /api/spot</code>: Executes a spot trade.</li>
                  <li><code>GET /api/tokens/:chainId</code>: Retrieves supported tokens for a chain.</li>
                </ul>
              </SectionHeader>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Docs;
