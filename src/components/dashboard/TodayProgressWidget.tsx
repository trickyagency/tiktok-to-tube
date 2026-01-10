import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target } from 'lucide-react';

interface TodayProgressWidgetProps {
  uploaded: number;
  goal: number;
  yesterdayCount: number;
}

const TodayProgressWidget = ({ uploaded, goal, yesterdayCount }: TodayProgressWidgetProps) => {
  const percentage = goal > 0 ? Math.min((uploaded / goal) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const comparison = uploaded - yesterdayCount;
  const comparisonText = comparison > 0 
    ? `+${comparison} from yesterday` 
    : comparison < 0 
      ? `${comparison} from yesterday`
      : 'Same as yesterday';

  const getProgressColor = () => {
    if (percentage >= 100) return 'text-success';
    if (percentage >= 50) return 'text-primary';
    return 'text-warning';
  };

  return (
    <Card className="border-0 stat-gradient-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Today's Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Radial Progress */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                strokeWidth="8"
                className="fill-none stroke-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                strokeWidth="8"
                strokeLinecap="round"
                className={`fill-none ${getProgressColor()} transition-all duration-500`}
                style={{
                  stroke: 'currentColor',
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{uploaded}</span>
              <span className="text-[10px] text-muted-foreground">of {goal}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${percentage >= 100 ? 'bg-success/10' : 'bg-primary/10'}`}>
                <TrendingUp className={`h-3.5 w-3.5 ${percentage >= 100 ? 'text-success' : 'text-primary'}`} />
              </div>
              <span className="text-sm font-medium">
                {percentage >= 100 ? 'Goal reached!' : `${Math.round(percentage)}% complete`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{comparisonText}</p>
            {uploaded === 0 && (
              <p className="text-xs text-muted-foreground/70 italic">
                Videos will be published on schedule
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayProgressWidget;
