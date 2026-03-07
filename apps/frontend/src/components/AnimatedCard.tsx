import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { IconType } from 'react-icons';

interface AnimatedCardProps {
  title: string;
  content: string;
  icon: IconType;
  onClose: () => void;
  variant?: 'toast' | 'banner';
  show?: boolean;
  notificationNumber?: number;
  className?: string;
}

export function AnimatedCard({
  title,
  content,
  icon: Icon,
  onClose,
  variant = 'toast',
  show,
  notificationNumber,
  className
}: AnimatedCardProps) {
  if (variant === 'banner') {
    // New banner variant, styled like the image and common announcements
    return (
      <div className={cn("bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-md shadow-md flex items-center justify-between w-full", className)}>
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-4 text-blue-500" />
          <div>
            <p className="font-bold text-base">{title}</p>
            <p className="text-sm">{content}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-blue-700 hover:bg-blue-200 rounded-full p-1 text-xl leading-none">
          &times;
        </button>
      </div>
    );
  }

  // 'toast' variant (original code)
  return (
    <div
      className={cn(
        'fixed top-4 right-4 w-80 rounded-lg shadow-lg transition-all duration-500 ease-in-out',
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        className
      )}
      style={{ zIndex: 100 }}
    >
      <Card className="bg-background/80 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-start">
            {notificationNumber && (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mr-4">
                {notificationNumber}
              </div>
            )}
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
