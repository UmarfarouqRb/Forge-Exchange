import { useMediaQuery } from '@/hooks/use-media-query';

export function useBreakpoint(breakpoint: string) {
  return useMediaQuery(`(min-width: ${breakpoint})`);
}