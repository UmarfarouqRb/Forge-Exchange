
import React from 'react';
import { FiDownload } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const sections = {
    'user-guide': {
      title: 'User Guide',
      content: (
        <>
          <p className="mb-6 text-muted-foreground">
            Forge is a professional CEX-style decentralized cryptocurrency exchange with multi-chain support. Users can trade crypto without KYC by connecting their Email, Socials or Web3 wallet (e.g., MetaMask). The platform features a modern user interface for easy interaction and trade based on intent trading, TradingView integration for live market data, and full mobile responsiveness.
          </p>
        </>
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
  };

  return (
    <footer className="bg-background text-foreground border-t border-border mt-12">
        <div className="container mx-auto p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                    <h2 className="text-2xl font-bold mb-4">Download Our App</h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <a href="https://play.google.com/store/apps/details?id=com.forge.exchange" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-primary text-primary-foreground p-3 rounded-md hover:bg-primary/90 transition-colors">
                            <FiDownload className="w-5 h-5" />
                            <span>Download for Android</span>
                        </a>
                        <a href="https://apps.apple.com/us/app/forge-exchange/id1234567890" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-primary text-primary-foreground p-3 rounded-md hover:bg-primary/90 transition-colors">
                            <FiDownload className="w-5 h-5" />
                            <span>Download for iOS</span>
                        </a>
                    </div>
                </div>
                <div className="col-span-1">
                    <h3 className="text-lg font-semibold mb-4">User Guide</h3>
                    {sections['user-guide'].content}
                </div>
                <div className="col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Developer Guide</h3>
                    {sections['developer-guide'].content}
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-border/50">
                <h3 className="text-lg font-semibold mb-4">Tech Stack</h3>
                {sections['tech-stack'].content}
            </div>
            <div className="text-center mt-12 text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Forge.inc. All rights reserved.</p>
                <div className="flex justify-center space-x-4 mt-4">
                    <a href="https://twitter.com/forge" target="_blank" rel="noopener noreferrer">Twitter</a>
                    <a href="https://discord.gg/forge" target="_blank" rel="noopener noreferrer">Discord</a>
                    <a href="mailto:contact@forge.inc">Contact Us</a>
                    <Link to="/docs">Docs</Link>
                </div>
            </div>
        </div>
    </footer>
  );
};

export default Footer;
