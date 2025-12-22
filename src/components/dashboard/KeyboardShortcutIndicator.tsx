import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface KeyboardShortcutIndicatorProps {
  isVisible: boolean;
}

const shortcuts = [
  { key: 'D', label: 'Dashboard' },
  { key: 'Q', label: 'Queue' },
  { key: 'H', label: 'History' },
  { key: 'Y', label: 'YouTube' },
  { key: 'T', label: 'TikTok' },
  { key: 'S', label: 'Settings' },
  { key: 'A', label: 'Analytics' },
];

const KeyboardShortcutIndicator = ({ isVisible }: KeyboardShortcutIndicatorProps) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none',
        'transition-all duration-200 ease-out',
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      )}
    >
      <div className="glass rounded-xl px-5 py-4 shadow-lg border border-border/50">
        <div className="text-center mb-3">
          <span className="text-sm font-medium text-muted-foreground">Go to...</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-center max-w-xs">
          {shortcuts.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-6 w-6 rounded bg-muted text-xs font-mono font-semibold text-foreground border border-border">
                {key}
              </kbd>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutIndicator;
