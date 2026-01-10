import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Zap, Crown, Flame, Target, Award, Medal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

interface AchievementBadgesProps {
  publishedCount: number;
  youtubeChannels: number;
  tiktokAccounts: number;
  schedulesActive: number;
}

const AchievementBadges = ({
  publishedCount,
  youtubeChannels,
  tiktokAccounts,
  schedulesActive,
}: AchievementBadgesProps) => {
  const achievements: Achievement[] = [
    {
      id: 'first-video',
      name: 'First Upload',
      description: 'Published your first video',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      earned: publishedCount >= 1,
    },
    {
      id: 'video-10',
      name: '10 Videos',
      description: 'Published 10 videos',
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      earned: publishedCount >= 10,
      progress: Math.min(publishedCount, 10),
      target: 10,
    },
    {
      id: 'video-50',
      name: 'Pro Publisher',
      description: 'Published 50 videos',
      icon: Trophy,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      earned: publishedCount >= 50,
      progress: Math.min(publishedCount, 50),
      target: 50,
    },
    {
      id: 'video-100',
      name: 'Century Club',
      description: 'Published 100 videos',
      icon: Crown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      earned: publishedCount >= 100,
      progress: Math.min(publishedCount, 100),
      target: 100,
    },
    {
      id: 'multi-channel',
      name: 'Multi-Channel',
      description: 'Connected 2+ YouTube channels',
      icon: Medal,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      earned: youtubeChannels >= 2,
    },
    {
      id: 'automation-master',
      name: 'Automation Master',
      description: 'Set up active schedules',
      icon: Flame,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      earned: schedulesActive >= 1,
    },
  ];

  const earnedAchievements = achievements.filter(a => a.earned);
  const nextAchievement = achievements.find(a => !a.earned && a.progress !== undefined);

  return (
    <Card className="border-0 stat-gradient-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Achievements
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {earnedAchievements.length}/{achievements.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Earned Badges Grid */}
        <div className="flex flex-wrap gap-2">
          {achievements.slice(0, 6).map((achievement) => (
            <Tooltip key={achievement.id}>
              <TooltipTrigger asChild>
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-default ${
                    achievement.earned 
                      ? `${achievement.bgColor} ring-2 ring-offset-2 ring-offset-background ${achievement.color.replace('text-', 'ring-')}`
                      : 'bg-muted/50 opacity-40'
                  }`}
                >
                  <achievement.icon 
                    className={`h-5 w-5 ${achievement.earned ? achievement.color : 'text-muted-foreground'}`} 
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="font-medium">{achievement.name}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
                {!achievement.earned && achievement.progress !== undefined && (
                  <p className="text-xs text-primary mt-1">
                    Progress: {achievement.progress}/{achievement.target}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Next Achievement Progress */}
        {nextAchievement && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full ${nextAchievement.bgColor} flex items-center justify-center`}>
                <nextAchievement.icon className={`h-4 w-4 ${nextAchievement.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium truncate">{nextAchievement.name}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {nextAchievement.progress}/{nextAchievement.target}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${((nextAchievement.progress || 0) / (nextAchievement.target || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementBadges;
