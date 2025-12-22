import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, User, Bell, Key, Eye, EyeOff, Mail, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import EmailPreview from '@/components/settings/EmailPreview';

const Settings = () => {
  const { user, isOwner } = useAuth();
  const { getSetting, updateSetting, isUpdating, isLoading } = usePlatformSettings();
  
  const [apifyApiKey, setApifyApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Email branding state
  const [platformName, setPlatformName] = useState('TrickyHub');
  const [senderName, setSenderName] = useState('TrickyHub');
  const [senderEmail, setSenderEmail] = useState('onboarding@resend.dev');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#18181b');
  const [accentColor, setAccentColor] = useState('#3b82f6');

  useEffect(() => {
    if (isOwner && !isLoading) {
      const savedKey = getSetting('APIFY_API_KEY');
      if (savedKey) {
        setApifyApiKey(savedKey);
      }
      
      // Load email branding settings
      setPlatformName(getSetting('EMAIL_PLATFORM_NAME') || 'TrickyHub');
      setSenderName(getSetting('EMAIL_SENDER_NAME') || 'TrickyHub');
      setSenderEmail(getSetting('EMAIL_SENDER_ADDRESS') || 'onboarding@resend.dev');
      setLogoUrl(getSetting('EMAIL_LOGO_URL') || '');
      setPrimaryColor(getSetting('EMAIL_PRIMARY_COLOR') || '#18181b');
      setAccentColor(getSetting('EMAIL_ACCENT_COLOR') || '#3b82f6');
    }
  }, [isOwner, isLoading, getSetting]);

  const handleSaveApiKey = () => {
    if (apifyApiKey.trim()) {
      updateSetting('APIFY_API_KEY', apifyApiKey.trim());
    }
  };

  const handleSaveBranding = () => {
    updateSetting('EMAIL_PLATFORM_NAME', platformName.trim() || 'TrickyHub');
    updateSetting('EMAIL_SENDER_NAME', senderName.trim() || 'TrickyHub');
    updateSetting('EMAIL_SENDER_ADDRESS', senderEmail.trim() || 'onboarding@resend.dev');
    updateSetting('EMAIL_LOGO_URL', logoUrl.trim());
    updateSetting('EMAIL_PRIMARY_COLOR', primaryColor);
    updateSetting('EMAIL_ACCENT_COLOR', accentColor);
  };

  const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);

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
          <>
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

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Branding
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full ml-2">
                    Owner Only
                  </span>
                </CardTitle>
                <CardDescription>
                  Customize invitation emails with your branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name">Platform Name</Label>
                    <Input 
                      id="platform-name" 
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      placeholder="TrickyHub"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input 
                      id="sender-name" 
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="TrickyHub"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-email">Sender Email</Label>
                  <Input 
                    id="sender-email" 
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="onboarding@resend.dev"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    ⚠️ Must match a verified{' '}
                    <a 
                      href="https://resend.com/domains" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Resend domain
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL (optional)</Label>
                  <Input 
                    id="logo-url" 
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTPS URL to your logo image (recommended: 200x50px)
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Primary Color
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        id="primary-color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#18181b"
                        className={!isValidHex(primaryColor) ? 'border-destructive' : ''}
                      />
                      <div 
                        className="h-10 w-10 rounded-md border border-border shrink-0"
                        style={{ backgroundColor: isValidHex(primaryColor) ? primaryColor : '#18181b' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent-color" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Accent Color
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        id="accent-color" 
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#3b82f6"
                        className={!isValidHex(accentColor) ? 'border-destructive' : ''}
                      />
                      <div 
                        className="h-10 w-10 rounded-md border border-border shrink-0"
                        style={{ backgroundColor: isValidHex(accentColor) ? accentColor : '#3b82f6' }}
                      />
                    </div>
                  </div>
                </div>

                <EmailPreview 
                  platformName={platformName || 'TrickyHub'}
                  logoUrl={logoUrl}
                  primaryColor={isValidHex(primaryColor) ? primaryColor : '#18181b'}
                  accentColor={isValidHex(accentColor) ? accentColor : '#3b82f6'}
                />

                <Button 
                  onClick={handleSaveBranding} 
                  disabled={isUpdating || !isValidHex(primaryColor) || !isValidHex(accentColor)}
                  className="w-full"
                >
                  {isUpdating ? 'Saving...' : 'Save Branding Settings'}
                </Button>
              </CardContent>
            </Card>
          </>
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
