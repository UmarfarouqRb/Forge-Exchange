import { usePoints } from '@/contexts/PointsContext';
import { Badge } from '@/components/ui/badge';

export const LevelBadge = () => {
  const { level, loading } = usePoints();

  if (loading) {
    return null;
  }

  return (
    <Badge variant="default" className="bg-blue-400 text-white">
      lvl {level}
    </Badge>
  );
};
