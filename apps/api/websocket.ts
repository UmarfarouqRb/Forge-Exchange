import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage';
import { TradingPair } from '@forge/schema';

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Send all trading pairs on connection
    storage.getAllTradingPairs().then((pairs) => {
      ws.send(JSON.stringify({ type: 'allPairs', data: pairs }));
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  storage.on('tradingPairUpdated', (pair: TradingPair) => {
    const message = JSON.stringify({ type: 'priceUpdate', data: pair });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  console.log('WebSocket server created');
}
