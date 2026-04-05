import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '@/components/AgentLog';
import { useAgentSocket } from '@/lib/ws/agent';

export function useAgentStatus(orderId?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { lastMessage } = useAgentSocket();

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'agent_status') {
            if (orderId && data.payload.orderId === orderId) {
                const newLog: LogEntry = {
                    ...data.payload,
                    timestamp: Date.now(),
                };
                setLogs(prevLogs => [...prevLogs, newLog]);
            } else if (!orderId) {
                const newLog: LogEntry = {
                    ...data.payload,
                    timestamp: Date.now(),
                };
                setLogs(prevLogs => [...prevLogs, newLog]);
            }
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    }
  }, [lastMessage, orderId]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
        orderId: orderId || 'general',
        msg: message,
        type: type,
        timestamp: Date.now(),
    };
    setLogs(prevLogs => [...prevLogs, newLog]);
  }, [orderId]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
