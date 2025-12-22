import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CopyableUrlProps {
  url: string;
  label?: string;
  className?: string;
}

export function CopyableUrl({ url, label, className }: CopyableUrlProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={className}>
      {label && (
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
      )}
      <div className="flex items-center gap-2 bg-muted rounded-md p-2">
        <code className="text-xs flex-1 break-all font-mono">{url}</code>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCopy}
          className="h-7 w-7 p-0 shrink-0"
          type="button"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
