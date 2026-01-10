import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle2, Circle, Sparkles, TrendingUp } from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  link: string;
  isComplete: boolean;
}

interface WelcomeBannerProps {
  youtubeCount: number;
  tiktokCount: number;
  hasSchedule: boolean;
  publishedToday?: number;
  publishedThisWeek?: number;
}

const WelcomeBanner = ({ 
  youtubeCount, 
  tiktokCount, 
  hasSchedule,
  publishedToday = 0,
  publishedThisWeek = 0,
}: WelcomeBannerProps) => {
  const { user } = useAuth();

  const steps: SetupStep[] = [
    {
      id: 'youtube',
      title: 'Connect YouTube',
      description: 'Add your YouTube channel',
      link: '/dashboard/youtube',
      isComplete: youtubeCount > 0,
    },
    {
      id: 'tiktok',
      title: 'Add TikTok',
      description: 'Monitor a TikTok account',
      link: '/dashboard/tiktok',
      isComplete: tiktokCount > 0,
    },
    {
      id: 'schedule',
      title: 'Set Up Schedule',
      description: 'Configure publishing',
      link: '/dashboard/queue',
      isComplete: hasSchedule,
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progress = (completedSteps / steps.length) * 100;
  const isComplete = completedSteps === steps.length;
  const nextStep = steps.find(s => !s.isComplete);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.email?.split('@')[0] || 'there';

  // Streamlined completed state
  if (isComplete) {
    return (
      <div className="relative overflow-hidden rounded-xl gradient-primary p-4 text-white mb-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-10 w-10 rounded-full bg-white/20 items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {getGreeting()}, {userName}!
              </h2>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {publishedToday} today
                </span>
                <span className="text-white/50">•</span>
                <span>{publishedThisWeek} this week</span>
              </div>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
            <Link to="/dashboard/queue">
              View Queue
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 mb-6">
      <div className="absolute top-0 right-0 w-64 h-64 gradient-primary opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {getGreeting()}, {userName}!
            </h2>
            <p className="text-muted-foreground">
              Complete your setup to start automating content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-sm font-medium">{completedSteps} of {steps.length}</span>
              <span className="text-sm text-muted-foreground ml-1">complete</span>
            </div>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <Link
              key={step.id}
              to={step.link}
              className={`group relative flex items-start gap-3 p-4 rounded-lg border transition-all ${
                step.isComplete 
                  ? 'bg-success/5 border-success/20' 
                  : step === nextStep
                    ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                    : 'bg-muted/50 border-transparent hover:bg-muted'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <div className="relative">
                    <Circle className={`h-5 w-5 ${step === nextStep ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${step.isComplete ? 'text-success' : ''}`}>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {step === nextStep && (
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
