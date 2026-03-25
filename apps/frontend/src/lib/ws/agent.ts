import { useState, useEffect } from 'react';

let socket: WebSocket | null = null;
const subscribers = new Set<(message: MessageEvent) => void>();

const AGENT_WS_URL = 'ws://localhost:8081/ws';

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
        setTimeout(connect, 5000);
    };

    socket.onerror = (error) => {
        console.error('Agent WebSocket error:', error);
        socket?.close();
    };
}

export function useAgentWebSocket() {
    const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

    useEffect(() => {
        const callback = (message: MessageEvent) => {
            setLastMessage(message);
        };

        subscribers.add(callback);

        // Ensure connection is active
        connect();

        return () => {
            subscribers.delete(callback);
        };
    }, []);

    return { lastMessage };
}

// Initialize the connection
connect();
