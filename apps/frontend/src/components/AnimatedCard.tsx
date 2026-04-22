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
    return (
      <div className={cn(
        "p-4 rounded-lg flex items-center justify-between w-full",
        "dark:bg-[#0D111C] dark:border dark:border-[#2A3547]", // Dark theme
        "bg-white border border-gray-200 shadow-sm", // Light theme
        className
      )}>
        <div className="flex items-center">
          <div className={cn(
            "p-2 rounded-full mr-4",
            "dark:bg-[#171E2D]", // Dark theme
            "bg-gray-100" // Light theme
          )}>
            <Icon className={cn(
              "h-5 w-5",
              "dark:text-[#94A3B8]", // Dark theme
              "text-gray-600" // Light theme
            )} />
          </div>
          <div>
            <p className={cn(
              "font-semibold text-base",
              "dark:text-[#E2E8F0]", // Dark theme
              "text-gray-900" // Light theme
            )}>{title}</p>
            <p className={cn(
              "text-sm",
              "dark:text-[#94A3B8]", // Dark theme
              "text-gray-600" // Light theme
            )}>{content}</p>
          </div>
        </div>
        <button onClick={onClose} className={cn(
          "rounded-full p-1.5 text-xl leading-none",
          "dark:text-[#94A3B8] dark:hover:bg-[#171E2D]", // Dark theme
          "text-gray-500 hover:bg-gray-100" // Light theme
        )}>
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
