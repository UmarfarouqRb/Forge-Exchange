import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAddress, isAddress } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string) {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.substring(0, 2)}..${address.substring(address.length - 4)}`;
}

export function safeAddress(address: string | undefined): `0x${string}` | undefined {
  if (!address || !isAddress(address)) {
    return undefined;
  }
  return getAddress(address);
}
