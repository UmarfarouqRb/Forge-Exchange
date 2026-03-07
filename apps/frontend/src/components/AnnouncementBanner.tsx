import React, { useState } from 'react';
import { AnimatedCard } from './AnimatedCard';
import { Gift } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: 'BTC Trading Competition',
    content: 'Join the BTC/USDC trading competition and win up to $10,000!'
  },
  // Add more announcements here
];

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleClose = () => {
    setVisible(false);
  };

  const currentAnnouncement = announcements[currentIndex];

  if (!visible || !currentAnnouncement) return null;

  return (
    <AnimatedCard
      variant="banner"
      title={currentAnnouncement.title}
      content={currentAnnouncement.content}
      icon={Gift}
      onClose={handleClose}
      className="w-full max-w-4xl mx-auto"
    />
  );
}