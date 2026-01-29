import { WebSocketServer, WebSocket } from 'ws';
import { getAllPairs } from './src/pairs';
import { TradingPair } from '@forge/db';
import { EventEmitter } from 'events';

// Create an EventEmitter instance
const eventEmitter = new EventEmitter();

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Send all trading pairs on connection
    getAllPairs().then((pairs) => {
      ws.send(JSON.stringify({ type: 'allPairs', data: pairs }));
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Listen for the 'tradingPairUpdated' event
  eventEmitter.on('tradingPairUpdated', (pair: TradingPair) => {
    const message = JSON.stringify({ type: 'priceUpdate', data: pair });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  console.log('WebSocket server created');
}

// Function to emit the 'tradingPairUpdated' event
export function emitTradingPairUpdate(pair: TradingPair) {
  eventEmitter.emit('tradingPairUpdated', pair);
}
