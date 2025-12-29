import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Zap, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const PWAInstallPrompt = () => {
  const { canInstall, installApp, isInstalled } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled) {
      setIsVisible(false);
      return;
    }

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 transition-all duration-300 ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-primary to-purple-500 p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Install RepostFlow</h3>
                <p className="text-sm text-primary-foreground/80">Get the full app experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Wifi className="w-4 h-4 text-primary" />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            <span>Faster load times</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Download className="w-4 h-4 text-primary" />
            <span>Quick access from home screen</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleInstall} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Install Now
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
