import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

export const PWAUpdatePrompt = () => {
  const { needRefresh, updateServiceWorker, dismissRefresh } = usePWA();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Update Available</h3>
                <p className="text-sm text-muted-foreground">
                  A new version of RepostFlow is ready
                </p>
              </div>
            </div>
            <button
              onClick={dismissRefresh}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => updateServiceWorker(true)} className="flex-1 gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload Now
            </Button>
            <Button variant="outline" onClick={dismissRefresh}>
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
