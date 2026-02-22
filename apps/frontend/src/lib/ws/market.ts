
let socket: WebSocket | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cbs = new Map<string, (data: any) => void>();

const API_WS_URL = 'wss://forge-exchange-api.onrender.com:10000';

function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    socket = new WebSocket(API_WS_URL);

    socket.onopen = () => {
        console.log('WebSocket connected');
        // Resubscribe to all topics upon reconnection
        cbs.forEach((_, topic) => {
            sendMessage({ type: 'subscribe', topic });
        });
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.topic && cbs.has(message.topic)) {
                const callback = cbs.get(message.topic)!;
                if (message.data) {
                    callback(message.data);
                } else {
                    callback(message);
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    socket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after a delay
        setTimeout(connect, 5000);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket?.close();
    };
}

function sendMessage(message: { type: string, topic: string }) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not connected.');
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function subscribe(topic: string, cb: (data: any) => void) {
  console.log(`Subscribing to WebSocket topic: ${topic}`);
  cbs.set(topic, cb);
  if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'subscribe', topic });
  }
  // Ensure connection is active
  connect();
}

export function unsubscribe(topic: string) {
  console.log(`Unsubscribing from WebSocket topic: ${topic}`);
  cbs.delete(topic);
  if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'unsubscribe', topic });
  }
}

// Initialize the connection
connect();
