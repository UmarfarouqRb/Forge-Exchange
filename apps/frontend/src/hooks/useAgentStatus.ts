import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '@/components/AgentLog';
import { useAgentSocket } from '@/lib/ws/agent';
import { usePrivy } from '@privy-io/react-auth';

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
                orderId: data.orderId,
                msg: data.msg,
                type: data.type || 'info',
                timestamp: Date.now(),
            };
            setLogs(prevLogs => [...prevLogs, newLog]);
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