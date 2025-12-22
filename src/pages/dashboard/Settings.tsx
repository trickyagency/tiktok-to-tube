import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, User, Bell, Key, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const Settings = () => {
  const { user, isOwner } = useAuth();
  const { getSetting, updateSetting, isUpdating, isLoading } = usePlatformSettings();
  
  const [apifyApiKey, setApifyApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOwner && !isLoading) {
      const savedKey = getSetting('APIFY_API_KEY');
      if (savedKey) {
        setApifyApiKey(savedKey);
      }
    }
  }, [isOwner, isLoading, getSetting]);

  const handleSaveApiKey = () => {
    if (apifyApiKey.trim()) {
      updateSetting('APIFY_API_KEY', apifyApiKey.trim());
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your account and preferences"
    >
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                defaultValue={user?.user_metadata?.full_name || ''} 
                placeholder="Your name"
              />
            </div>
            <Button>Update Profile</Button>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Keys
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full ml-2">
                  Owner Only
                </span>
              </CardTitle>
              <CardDescription>
                Manage platform API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apify-key">Apify API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      id="apify-key" 
                      type={showApiKey ? 'text' : 'password'}
                      value={apifyApiKey}
                      onChange={(e) => setApifyApiKey(e.target.value)}
                      placeholder="Enter your Apify API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={handleSaveApiKey} disabled={isUpdating || !apifyApiKey.trim()}>
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a 
                    href="https://console.apify.com/account/integrations" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Apify Console → Integrations
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notification settings coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Advanced
            </CardTitle>
            <CardDescription>Advanced configuration options</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Advanced settings will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
