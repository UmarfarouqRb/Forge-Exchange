import React, { useState, useEffect } from 'react';
import { AnimatedCard } from './AnimatedCard';
import { Gift, TrendingUp, Zap } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  icon: React.ElementType;
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: 'BTC Trading Competition',
    content: 'Join the BTC/USDC trading competition and win up to $10,000!',
    icon: Gift,
  },
  {
    id: 2,
    title: 'New Market Listing: EURC/USDC',
    content: 'The EURC/USDC market is now live for spot trading.',
    icon: TrendingUp,
  },
   {
    id: 3,
    title: 'Scheduled Maintenance',
    content: 'The platform will undergo scheduled maintenance on Sunday at 2:00 AM UTC.',
    icon: Zap,
  },
];

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (announcements.length > 1) {
      const interval = setInterval(() => {
        setIsFading(true);
        setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
          setIsFading(false);
        }, 500); // Fade-out duration
      }, 3000); // 3 seconds interval + 0.5s fade = 3.5 seconds total

      return () => clearInterval(interval);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  const currentAnnouncement = announcements[currentIndex];

  if (!visible || !currentAnnouncement) return null;

  return (
    <div
      key={currentAnnouncement.id}
      className={`transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <AnimatedCard
        variant="banner"
        title={currentAnnouncement.title}
        content={currentAnnouncement.content}
        icon={currentAnnouncement.icon}
        onClose={handleClose}
        className="w-full max-w-4xl mx-auto"
      />
    </div>
  );
}
