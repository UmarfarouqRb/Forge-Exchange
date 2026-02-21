import { FiBell, FiAlertTriangle, FiGift, FiPhone } from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { IconType } from 'react-icons';

export interface Notification {
  id: number;
  title: string;
  content: string;
  icon: IconType;
}

export const notifications: Notification[] = [
  {
    id: 1,
    title: "BTC Trading Competition",
    content: "Join the BTC/USDC trading competition and win up to $10,000!",
    icon: FiGift,
  },
  {
    id: 2,
    title: "Scheduled Maintenance",
    content: "The platform will be undergoing scheduled maintenance on Friday at 10:00 PM UTC.",
    icon: FiAlertTriangle,
  },
  {
    id: 3,
    title: "New Asset Listing",
    content: "The new asset, HYPE, is now available for trading on all supported chains.",
    icon: FiBell,
  },
  {
    id: 4,
    title: "Forge Exchange Beta",
    content: "The Forge Exchange Beta will be starting soon. Get ready for new features!",
    icon: FaFire,
  },
  {
    id: 5,
    title: "ETH Trading Competition",
    content: "Join the ETH trading competition to win a brand new iPhone 17 Air!",
    icon: FiPhone,
  },
];