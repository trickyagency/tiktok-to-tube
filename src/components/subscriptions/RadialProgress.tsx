import { cn } from '@/lib/utils';

interface RadialProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  colorClass?: string;
  showLabel?: boolean;
  label?: React.ReactNode;
}

export function RadialProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  className,
  colorClass = 'text-emerald-500',
  showLabel = true,
  label
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  // Determine color based on percentage
  const getColorClass = () => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-amber-500';
    return colorClass;
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('transition-all duration-1000 ease-out', getColorClass())}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label || (
            <>
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">of {max}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
