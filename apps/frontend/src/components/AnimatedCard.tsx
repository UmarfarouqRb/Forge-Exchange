import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { IconType } from 'react-icons';

interface AnimatedCardProps {
  title: string;
  content: string;
  icon: IconType;
  show: boolean;
  notificationNumber: number;
  onClose: () => void;
}

export function AnimatedCard({ title, content, icon: Icon, show, notificationNumber, onClose }: AnimatedCardProps) {
  return (
    <div
      className={cn(
        'fixed top-4 right-4 w-80 rounded-lg shadow-lg transition-all duration-500 ease-in-out',
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
      style={{ zIndex: 100 }}
    >
      <Card className="bg-background/80 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mr-4">
                {notificationNumber}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold flex items-center">
                        <Icon className="mr-2" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-primary">
                    &times;
                    </button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{content}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}