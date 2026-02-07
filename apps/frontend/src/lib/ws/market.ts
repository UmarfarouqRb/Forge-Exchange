
let socket: WebSocket | null = null;
const cbs = new Map<string, (data: any) => void>();

const API_WS_URL = 'wss://forge-exchange-api.onrender.com';

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
                cbs.get(message.topic)!(message.data);
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

function sendMessage(message: any) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not connected.');
    }
}

export function subscribe(topic: string, cb: (data: any) => void) {
  cbs.set(topic, cb);
  if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'subscribe', topic });
  }
  // Ensure connection is active
  connect();
}

export function unsubscribe(topic: string) {
  cbs.delete(topic);
  if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'unsubscribe', topic });
  }
}

// Initialize the connection
connect();
