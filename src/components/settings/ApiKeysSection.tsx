import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useTestApifyKey, ApifyStatus } from '@/hooks/useApifyStatus';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const ApiKeysSection = () => {
  const { getSetting, updateSetting, deleteSetting, isUpdating, isDeleting, isLoading } = usePlatformSettings();
  const { testKey } = useTestApifyKey();

  const [apifyApiKey, setApifyApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ status: ApifyStatus; message: string } | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const savedKey = getSetting('apify_api_key');
      if (savedKey) {
        setApifyApiKey(savedKey);
        setHasSavedKey(true);
      } else {
        setHasSavedKey(false);
      }
    }
  }, [isLoading, getSetting]);

  const handleSaveApiKey = () => {
    if (apifyApiKey.trim()) {
      updateSetting('apify_api_key', apifyApiKey.trim());
      setKeyTestResult(null);
      setHasSavedKey(true);
    }
  };

  const handleDeleteApiKey = () => {
    deleteSetting('apify_api_key');
    setApifyApiKey('');
    setKeyTestResult(null);
    setHasSavedKey(false);
  };

  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setKeyTestResult(null);
    try {
      const result = await testKey(apifyApiKey.trim() || undefined);
      setKeyTestResult({ status: result.status, message: result.message });
      
      if (result.valid) {
        toast.success(result.message);
      } else {
        toast.error(result.message, { description: result.details });
      }
    } catch (error) {
      const message = 'Failed to test API key';
      setKeyTestResult({ status: 'error', message });
      toast.error(message);
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm bg-card/50 backdrop-blur-sm">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
      
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">API Keys</CardTitle>
              <CardDescription>Manage platform API keys for external integrations</CardDescription>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            Owner Only
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="scraper-key" className="text-sm font-medium">Scraper API Key</Label>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Input 
                id="scraper-key" 
                type={showApiKey ? 'text' : 'password'}
                value={apifyApiKey}
                onChange={(e) => {
                  setApifyApiKey(e.target.value);
                  setKeyTestResult(null);
                }}
                placeholder="Enter your scraper API key"
                className="pr-10 h-11 bg-background/50"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button 
              variant="outline" 
              onClick={handleTestApiKey} 
              disabled={isTestingKey || !apifyApiKey.trim()}
              className="h-11"
            >
              {isTestingKey ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test'
              )}
            </Button>
            <Button onClick={handleSaveApiKey} disabled={isUpdating || !apifyApiKey.trim()} className="h-11">
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
            {hasSavedKey && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" disabled={isDeleting} className="h-11 w-11">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the scraper API key. Video scraping features will be disabled until a new key is configured.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteApiKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {keyTestResult && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
              keyTestResult.status === 'valid' 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              {keyTestResult.status === 'valid' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {keyTestResult.message}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Contact the platform administrator for the scraper API key.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeysSection;
