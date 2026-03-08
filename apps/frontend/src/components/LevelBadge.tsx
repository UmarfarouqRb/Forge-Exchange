import { usePoints } from '@/contexts/PointsContext';
import { Badge } from '@/components/ui/badge';

export const LevelBadge = () => {
  const { level, loading } = usePoints();

  if (loading) {
    return null;
  }

  return (
    <Badge variant="secondary">
      Level {level}
    </Badge>
  );
};
