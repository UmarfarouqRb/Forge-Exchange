import { MemStorage } from '../api/storage';
import { MarketService } from './market';

const storage = new MemStorage();
const marketService = new MarketService(storage);

async function main() {
  console.log('Starting Price Engine...');

  // Start the market service
  marketService.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down Price Engine...');
    marketService.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Unhandled error in Price Engine:', error);
  process.exit(1);
});
