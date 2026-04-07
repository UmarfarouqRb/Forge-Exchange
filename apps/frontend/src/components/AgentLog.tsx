
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAgentSocket } from '@/lib/ws/agent'; // Assuming this is the correct path

export interface LogEntry {
  orderId: string;
  msg: string;
  type: 'info' | 'error' | 'success';
  timestamp: number;
}

export function AgentLog() {
  const { address } = useAccount();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { lastMessage } = useAgentSocket(address || '');

  useEffect(() => {
    if (lastMessage) {
      try {
        const newLog = JSON.parse(lastMessage.data);
        // Add a timestamp to the log
        newLog.timestamp = Date.now();
        setLogs(prevLogs => [newLog, ...prevLogs]);
      } catch (error) {
        console.error("Failed to parse agent log message:", error);
      }
    }
  }, [lastMessage]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Agent Status</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className={cn(
                "text-xs p-2 rounded-md",
                log.type === 'info' && "bg-blue-500/10 text-blue-300",
                log.type === 'error' && "bg-red-500/10 text-red-400",
                log.type === 'success' && "bg-green-500/10 text-green-400",
              )}>
                <span className="font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="ml-2">{log.msg}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
