import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
  trend?: { value: number; isPositive: boolean };
  gradientClass: string;
  isWarning?: boolean;
  href?: string;
  tooltip?: string;
}

const AnimatedStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  gradientClass,
  isWarning = false,
  href,
  tooltip
}: AnimatedStatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 1000;
    const steps = 20;
    const stepValue = value / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  const cardContent = (
    <Card className={`card-hover border-0 ${gradientClass} ${href ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{displayValue}</span>
              {trend && (
                <span className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`p-3 rounded-xl bg-background/80 border ${isWarning ? 'border-amber-500/50' : 'border-border/50'}`}>
            <Icon className={`h-5 w-5 ${isWarning ? 'text-amber-500' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const wrappedCard = href ? (
    <Link to={href} className="block">
      {cardContent}
    </Link>
  ) : cardContent;

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {wrappedCard}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return wrappedCard;
};

export default AnimatedStatCard;
