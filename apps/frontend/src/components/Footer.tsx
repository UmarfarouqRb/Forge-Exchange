
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background text-foreground border-t border-border mt-12">
        <div className="container mx-auto p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                    <h2 className="text-2xl font-bold mb-4">Download Our App</h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <a href="https://play.google.com/store/apps/details?id=com.forge.exchange" target="_blank" rel="noopener noreferrer">
                            <img src="/assets/Google play(1).png" alt="Get it on Google Play" className="h-12" />
                        </a>
                        <a href="https://apps.apple.com/us/app/forge-exchange/id1234567890" target="_blank" rel="noopener noreferrer">
                            <img src="/assets/app store.png" alt="Download on the App Store" className="h-12" />
                        </a>
                    </div>
                </div>
            </div>
            <div className="text-center mt-12 text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Forge.inc. All rights reserved.</p>
                <div className="flex justify-center space-x-4 mt-4">
                    <a href="https://twitter.com/ForgeExchange" target="_blank" rel="noopener noreferrer">Twitter</a>
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
