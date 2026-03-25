import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface LogEntry {
  orderId: string;
  msg: string;
  type: 'info' | 'error' | 'success';
  timestamp: number;
}

interface AgentLogProps {
  logs: LogEntry[];
}

export function AgentLog({ logs }: AgentLogProps) {
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
