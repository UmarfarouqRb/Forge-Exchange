
import { useState, useEffect } from 'react';

let socket: WebSocket | null = null;
const subscribers = new Set<(message: MessageEvent) => void>();

const AGENT_WS_URL = import.meta.env.PROD
    ? 'wss://forge-exchange-api.onrender.com'
    : 'ws://localhost:8081/ws';

function connect(userAddress: string) {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    socket = new WebSocket(AGENT_WS_URL);

    socket.onopen = () => {
        console.log('Agent WebSocket connected');
        // Once connected, send the user's address to subscribe to their order updates
        const subscriptionMessage = JSON.stringify({
            type: 'subscribe',
            userAddress: userAddress
        });
        socket?.send(subscriptionMessage);
    };

    socket.onmessage = (event) => {
        subscribers.forEach(callback => callback(event));
    };

    socket.onclose = () => {
        console.log('Agent WebSocket disconnected');
        // Pass userAddress to reconnect
        setTimeout(() => connect(userAddress), 1000);
    };

    socket.onerror = (error) => {
        console.error('Agent WebSocket error:', JSON.stringify(error, ['message', 'name', 'stack']));
        socket?.close();
    };
}

function subscribe(callback: (message: MessageEvent) => void, userAddress: string) {
    subscribers.add(callback);
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        connect(userAddress);
    }

    return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
            socket?.close();
            socket = null;
        }
    };
}

export function useAgentSocket(userAddress: string) {
    const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

    useEffect(() => {
        if (userAddress) {
            const unsubscribe = subscribe(setLastMessage, userAddress);
            return () => unsubscribe();
        }
    }, [userAddress]);

    return { lastMessage };
}
