
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

// A map to store clients subscribed to specific topics (e.g., trading pairs, orders)
const subscriptions = new Map<string, Set<WebSocket>>();

export function createWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        // The client can send a message to subscribe to a topic
        if (data.type === 'subscribe' && data.topic) {
          subscribeClient(ws, data.topic);
        }
        // The client can also unsubscribe
        if (data.type === 'unsubscribe' && data.topic) {
          unsubscribeClient(ws, data.topic);
        }
      } catch (e) {
        console.error('Failed to parse message or handle subscription:', e);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      // On close, remove the client from all subscriptions
      unsubscribeClientFromAll(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        unsubscribeClientFromAll(ws);
    });
  });

  console.log('WebSocket server created');
}

function subscribeClient(ws: WebSocket, topic: string) {
  if (!subscriptions.has(topic)) {
    subscriptions.set(topic, new Set());
  }
  subscriptions.get(topic)!.add(ws);
  console.log(`Client subscribed to ${topic}`);
}

function unsubscribeClient(ws: WebSocket, topic: string) {
  if (subscriptions.has(topic)) {
    subscriptions.get(topic)!.delete(ws);
    console.log(`Client unsubscribed from ${topic}`);
  }
}

function unsubscribeClientFromAll(ws: WebSocket) {
    subscriptions.forEach((clients, topic) => {
        if (clients.has(ws)) {
            clients.delete(ws);
            console.log(`Client unsubscribed from ${topic} due to disconnection`);
        }
    });
}

// Function to broadcast a message to all clients subscribed to a specific topic
export function broadcastToTopic(topic: string, message: any) {
  const subscribers = subscriptions.get(topic);
  if (subscribers) {
    const serializedMessage = JSON.stringify(message);
    subscribers.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serializedMessage);
      }
    });
  }
}

// Function to broadcast a message to all connected clients
export function broadcast(message: any) {
    if (!wss) {
        console.error("WebSocket server not initialized");
        return;
    }
    const serializedMessage = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(serializedMessage);
        }
    });
}
