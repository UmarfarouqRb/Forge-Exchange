import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string) {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.substring(0, 2)}..${address.substring(address.length - 4)}`;
}
