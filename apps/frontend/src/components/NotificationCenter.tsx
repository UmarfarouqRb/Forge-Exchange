import React, { useState, useEffect } from 'react';
import { notifications } from '../lib/notifications';
import { AnimatedCard } from './AnimatedCard';

export function NotificationCenter() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [show, setShow] = useState(true);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % notifications.length);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        handleNext();
        setShow(true);
      }, 500); // Wait for the exit animation to complete
    }, 4000); // Show each notification for 4 seconds

    return () => clearInterval(intervalId);
  }, []);

  const currentNotification = notifications[currentIndex];

  if (!currentNotification) {
    return null;
  }

  return (
    <AnimatedCard
      key={currentNotification.id}
      title={currentNotification.title}
      content={currentNotification.content}
      icon={currentNotification.icon}
      show={show}
      notificationNumber={currentIndex + 1}
      onClose={() => setShow(false)} // Allow users to close notifications manually
    />
  );
}