import { Keyboard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const KeyboardHints = () => {
  const shortcuts = [
    { keys: ['G', 'Q'], label: 'Queue' },
    { keys: ['G', 'Y'], label: 'YouTube' },
    { keys: ['G', 'T'], label: 'TikTok' },
    { keys: ['⌘', 'K'], label: 'Search' },
  ];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground hover:bg-muted transition-colors cursor-help">
          <Keyboard className="h-3.5 w-3.5" />
          <span className="text-xs">Shortcuts</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium mb-2">Keyboard Shortcuts</p>
          {shortcuts.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border border-border">
                      {key}
                    </kbd>
                    {i < keys.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default KeyboardHints;
