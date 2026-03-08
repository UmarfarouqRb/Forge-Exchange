import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Assuming you have a hook for authentication

interface PointsState {
  total_points: number;
  level: number;
  nextLevelPoints: number;
  loading: boolean;
}

const PointsContext = createContext<PointsState | undefined>(undefined);

export const PointsProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [points, setPoints] = useState<PointsState>({
    total_points: 0,
    level: 1,
    nextLevelPoints: 1000, // Default for level 1
    loading: true,
  });

  useEffect(() => {
    const fetchPoints = async () => {
      if (!user || !token) {
        setPoints(p => ({ ...p, loading: false }));
        return;
      }

      try {
        const response = await fetch('/api/v1/points', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch points');
        }

        const data = await response.json();
        setPoints({ ...data, loading: false });

      } catch (error) {
        console.error("Error fetching points:", error);
        setPoints(p => ({ ...p, loading: false })); // Stop loading even if there's an error
      }
    };

    fetchPoints();
  }, [user, token]);

  return (
    <PointsContext.Provider value={points}>
      {children}
    </PointsContext.Provider>
  );
};

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};
