import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, XCircle, Loader, Trash2, Copy } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface LogEntry {
  id: string; 
  msg: string;
  type: 'pending' | 'processing' | 'success' | 'error' | 'info';
  timestamp: number;
  details?: any; 
}

export interface AgentLogProps {
  logs: LogEntry[];
  clearLogs: () => void;
  maxLogs?: number;
}

const logConfig = {
  pending: {
    icon: <Loader className="h-4 w-4 animate-spin text-blue-400" />,
    color: 'text-blue-400',
    label: 'Pending',
  },
  processing: {
    icon: <Loader className="h-4 w-4 animate-spin text-cyan-400" />,
    color: 'text-cyan-400',
    label: 'Processing',
  },
  success: {
    icon: <CheckCircle className="h-4 w-4 text-green-400" />,
    color: 'text-green-400',
    label: 'Success',
  },
  error: {
    icon: <XCircle className="h-4 w-4 text-red-400" />,
    color: 'text-red-400',
    label: 'Error',
  },
  info: {
    icon: <CheckCircle className="h-4 w-4 text-blue-400" />,
    color: 'text-blue-400',
    label: 'Info',
  },
};

type RouteOption = "Automatic" | "Internal" | "External Dex";

const routeConfig: Record<RouteOption, { color: string; indicator: string }> = {
  "Automatic": {
    color: "text-green-400",
    indicator: "bg-green-400",
  },
  "Internal": {
    color: "text-blue-400",
    indicator: "bg-blue-400",
  },
  "External Dex": {
    color: "text-orange-400",
    indicator: "bg-orange-400",
  },
};

export function AgentLog({ logs, clearLogs, maxLogs = 10 }: AgentLogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>("Automatic");

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs]);

  const handleCopy = () => {
    const logString = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      let details = '';
      if (log.details) {
        details = JSON.stringify(log.details, null, 2);
      }
      return `[${timestamp}] [${log.type.toUpperCase()}] ${log.msg}${details ? `\n${details}` : ''}`;
    }).join('\n');
    navigator.clipboard.writeText(logString);
  };

  const displayedLogs = logs.slice(-maxLogs);

  return (
    <div className="bg-[#020617] border border-[#1E293B] rounded-lg h-[260px] md:h-[320px] flex flex-col text-sm font-mono overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-base text-[#E2E8F0]">Agent </h3>
          <ToggleGroup type="single" value={selectedRoute} onValueChange={(value: RouteOption) => { if (value) setSelectedRoute(value); }} className="flex items-center gap-2">
            {Object.keys(routeConfig).map((route) => (
              <ToggleGroupItem key={route} value={route} className="flex items-center gap-2 px-2 py-1 h-auto text-xs data-[state=on]:bg-white/10">
                <div className={cn("w-2 h-2 rounded-full", routeConfig[route as RouteOption].indicator)}></div>
                <span className={cn("capitalize", routeConfig[route as RouteOption].color)}>{route}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 text-[#94A3B8] hover:text-[#E2E8F0]">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={clearLogs} className="h-7 w-7 text-[#94A3B8] hover:text-[#E2E8F0]">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-grow overflow-hidden relative">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <AnimatePresence initial={false}>
            {displayedLogs.map((log) => (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={cn(
                  "flex items-start gap-3 px-4 py-2 border-b border-white/5",
                  logConfig[log.type].color
                )}
              >
                <div className="mt-0.5">{logConfig[log.type].icon}</div>
                <div className="flex-1">
                  <span className="font-bold mr-2">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                  <span className="italic">{log.msg}</span>
                  {log.details && (
                    <details className="mt-1 text-xs text-[#94A3B8]">
                      <summary className="cursor-pointer">View details</summary>
                      <pre className="mt-1 p-2 bg-black/20 rounded-md whitespace-pre-wrap text-xs">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  );
}
