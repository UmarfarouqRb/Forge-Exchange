import fetch from 'node-fetch';

const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000';

export class WarmingService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    console.log('[WarmingService] Starting...');
    this.intervalId = setInterval(this.pingRelayer.bind(this), 5 * 60 * 1000); // 5 minutes
    this.pingRelayer(); // Initial ping
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async pingRelayer() {
    try {
      const response = await fetch(`${RELAYER_URL}/api/health`);
      if (response.ok) {
        console.log('[WarmingService] Relayer is warm.');
      } else {
        console.error('[WarmingService] Relayer is not responding.');
      }
    } catch (error) {
      console.error('[WarmingService] Error pinging relayer:', error);
    }
  }
}
