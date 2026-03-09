import { usePoints } from '@/contexts/PointsContext';
import { Progress } from '@/components/ui/progress';

export const UserPoints = () => {
  const { total_points, level, nextLevelPoints, loading } = usePoints();

  if (loading) {
    return <div>Loading points...</div>;
  }

  const progress = (total_points / nextLevelPoints) * 100;

  return (
    <div className="w-full p-4 bg-blue-500 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <div className="text-white">
          <span className="font-bold">FGP</span>
          <span className="text-sm"> Forge Points</span>
        </div>
        <span className="text-white font-bold">Level {level}</span>
      </div>
      <Progress value={progress} className="w-full" />
      <div className="flex justify-between items-center mt-2">
        <span className="text-white text-sm">Total Points: {total_points}</span>
        <span className="text-white text-sm">Next Level: {nextLevelPoints}</span>
      </div>
    </div>
  );
};
