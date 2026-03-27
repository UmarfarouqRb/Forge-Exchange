
import { useState, useEffect } from 'react';

let socket: WebSocket | null = null;
const subscribers = new Set<(message: MessageEvent) => void>();

const AGENT_WS_URL = import.meta.env.PROD
    ? 'wss://forge-exchange-api.onrender.com'
    : 'ws://localhost:8081/ws';

function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    socket = new WebSocket(AGENT_WS_URL);

    socket.onopen = () => {
        console.log('Agent WebSocket connected');
    };

    socket.onmessage = (event) => {
        subscribers.forEach(callback => callback(event));
    };

    socket.onclose = () => {
        console.log('Agent WebSocket disconnected');
        setTimeout(connect, 5000); // Reconnect on close
    };

    socket.onerror = (error) => {
        console.error('Agent WebSocket error:', error);
        socket?.close(); // This will trigger onclose and reconnect
    };
}

function subscribe(callback: (message: MessageEvent) => void) {
    subscribers.add(callback);
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        connect();
    }

    return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
            socket?.close();
            socket = null;
        }
    };
}

export function useAgentSocket() {
    const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

    useEffect(() => {
        const unsubscribe = subscribe(setLastMessage);
        return () => unsubscribe();
    }, []);

    return { lastMessage };
}
