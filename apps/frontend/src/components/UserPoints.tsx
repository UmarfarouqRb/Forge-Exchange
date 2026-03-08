import { usePoints } from '@/contexts/PointsContext';
import { Progress } from '@/components/ui/progress';

export const UserPoints = () => {
  const { total_points, level, nextLevelPoints, loading } = usePoints();

  if (loading) {
    return <div>Loading points...</div>;
  }

  const progress = (total_points / nextLevelPoints) * 100;

  return (
    <div className="w-full p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-bold">Level {level}</span>
        <span className="text-gray-400">{total_points} / {nextLevelPoints} XP</span>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
};
