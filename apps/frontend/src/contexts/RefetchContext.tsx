
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

type RefetchContextType = {
  refetchCounter: number;
  triggerRefetch: () => void;
};

const RefetchContext = createContext<RefetchContextType | undefined>(undefined);

export function RefetchProvider({ children }: { children: React.ReactNode }) {
  const [refetchCounter, setRefetchCounter] = useState(0);

  const triggerRefetch = useCallback(() => {
    setRefetchCounter(c => c + 1);
  }, []);

  const value = useMemo(() => ({ refetchCounter, triggerRefetch }), [refetchCounter, triggerRefetch]);

  return (
    <RefetchContext.Provider value={value}>
      {children}
    </RefetchContext.Provider>
  );
}

export function useRefetchContext() {
  const context = useContext(RefetchContext);
  if (!context) {
    throw new Error('useRefetchContext must be used within a RefetchProvider');
  }
  return context;
}
