import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '@/components/AgentLog';
import { useAgentSocket } from '@/lib/ws/agent';
import { usePrivy } from '@privy-io/react-auth';

// Helper to map old log types to new ones
const mapLogType = (type: string): LogEntry['type'] => {
  switch (type) {
    case 'info':
    case 'pending':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'processing';
  }
};

export function useAgentStatus(orderId?: string) {
  const { user } = usePrivy();
  const userAddress = user?.wallet?.address || '';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { lastMessage } = useAgentSocket(userAddress);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        const isTargetOrder = !orderId || data.orderId === orderId;
        
        if (isTargetOrder && data.msg) {
            const newLog: LogEntry = {
                id: `${Date.now()}-${Math.random()}`,
                msg: data.msg,
                type: mapLogType(data.type || 'processing'),
                timestamp: Date.now(),
                details: data.details
            };
            setLogs(prevLogs => [...prevLogs, newLog]);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    }
  }, [lastMessage, orderId]);

  const addLog = useCallback((message: string, type: LogEntry['type'] | 'info' = 'pending', details?: any) => {
    const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        msg: message,
        type: mapLogType(type),
        timestamp: Date.now(),
        details,
    };
    setLogs(prevLogs => [...prevLogs, newLog]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
