import { cn } from '@/lib/utils';
import { Download, Upload, Check } from 'lucide-react';

interface UploadProgressBarProps {
  phase: string | null;
  percentage: number;
  className?: string;
}

const phases = [
  { key: 'downloading', label: 'Downloading video...', icon: Download },
  { key: 'uploading', label: 'Uploading to YouTube...', icon: Upload },
  { key: 'finalizing', label: 'Finalizing...', icon: Check },
];

export function UploadProgressBar({ phase, percentage, className }: UploadProgressBarProps) {
  const currentPhase = phases.find(p => p.key === phase) || phases[0];
  const PhaseIcon = currentPhase.icon;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            phase === 'finalizing' 
              ? 'bg-green-500' 
              : 'bg-gradient-to-r from-primary via-primary/80 to-primary animate-pulse'
          )}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      
      {/* Phase indicator */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <PhaseIcon className="h-3 w-3 animate-pulse" />
          <span>{currentPhase.label}</span>
        </div>
        <span className="text-muted-foreground font-medium">{percentage}%</span>
      </div>
    </div>
  );
}
