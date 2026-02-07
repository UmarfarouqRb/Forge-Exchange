
import type { Market } from '@/types';

const CACHE_KEY = 'marketStateCache';

// Helper to safely access localStorage
const getCache = (): Record<string, Market> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const cachedData = window.localStorage.getItem(CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : {};
  } catch (error) {
    console.error('Error reading market state from localStorage:', error);
    return {};
  }
};

// Helper to safely access localStorage
const setCache = (cache: Record<string, Market>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving market state to localStorage:', error);
  }
};

export const getMarketState = (tradingPairId: string): Market | null => {
    const cache = getCache();
    return cache[tradingPairId] || null;
}

export const setMarketState = (data: Market) => {
    if (!data || !data.id) {
        return;
    }
    const cache = getCache();
    cache[data.id] = data;
    setCache(cache);
}
