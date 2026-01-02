import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Palette } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import EmailPreview from '@/components/settings/EmailPreview';

export const EmailBrandingSection = () => {
  const { getSetting, updateSetting, isUpdating, isLoading } = usePlatformSettings();

  const [platformName, setPlatformName] = useState('RepostFlow');
  const [senderName, setSenderName] = useState('RepostFlow');
  const [senderEmail, setSenderEmail] = useState('notifications@repostflow.digitalautomators.com');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#18181b');
  const [accentColor, setAccentColor] = useState('#3b82f6');

  useEffect(() => {
    if (!isLoading) {
      setPlatformName(getSetting('EMAIL_PLATFORM_NAME') || 'RepostFlow');
      setSenderName(getSetting('EMAIL_SENDER_NAME') || 'RepostFlow');
      setSenderEmail(getSetting('EMAIL_SENDER_ADDRESS') || 'onboarding@resend.dev');
      setLogoUrl(getSetting('EMAIL_LOGO_URL') || '');
      setPrimaryColor(getSetting('EMAIL_PRIMARY_COLOR') || '#18181b');
      setAccentColor(getSetting('EMAIL_ACCENT_COLOR') || '#3b82f6');
    }
  }, [isLoading, getSetting]);

  const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);

  const handleSaveBranding = () => {
    updateSetting('EMAIL_PLATFORM_NAME', platformName.trim() || 'RepostFlow');
    updateSetting('EMAIL_SENDER_NAME', senderName.trim() || 'RepostFlow');
    updateSetting('EMAIL_SENDER_ADDRESS', senderEmail.trim() || 'onboarding@resend.dev');
    updateSetting('EMAIL_LOGO_URL', logoUrl.trim());
    updateSetting('EMAIL_PRIMARY_COLOR', primaryColor);
    updateSetting('EMAIL_ACCENT_COLOR', accentColor);
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm bg-card/50 backdrop-blur-sm">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
      
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Email Branding</CardTitle>
              <CardDescription>Customize invitation emails with your branding</CardDescription>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            Owner Only
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="platform-name" className="text-sm font-medium">Platform Name</Label>
            <Input 
              id="platform-name" 
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="RepostFlow"
              className="h-11 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-name" className="text-sm font-medium">Sender Name</Label>
            <Input 
              id="sender-name" 
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="RepostFlow"
              className="h-11 bg-background/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sender-email" className="text-sm font-medium">Sender Email</Label>
          <Input 
            id="sender-email" 
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="onboarding@resend.dev"
            className="h-11 bg-background/50"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
            <span className="text-amber-500">⚠</span>
            Must match a verified{' '}
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
          <Label htmlFor="logo-url" className="text-sm font-medium">Logo URL (optional)</Label>
          <Input 
            id="logo-url" 
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="h-11 bg-background/50"
          />
          <p className="text-xs text-muted-foreground">
            HTTPS URL to your logo image (recommended: 200x50px)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-color" className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Primary Color
            </Label>
            <div className="flex gap-2">
              <Input 
                id="primary-color" 
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#18181b"
                className={`h-11 bg-background/50 ${!isValidHex(primaryColor) ? 'border-destructive' : ''}`}
              />
              <div 
                className="h-11 w-11 rounded-xl border-2 border-border shrink-0 transition-colors"
                style={{ backgroundColor: isValidHex(primaryColor) ? primaryColor : '#18181b' }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color" className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Accent Color
            </Label>
            <div className="flex gap-2">
              <Input 
                id="accent-color" 
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#3b82f6"
                className={`h-11 bg-background/50 ${!isValidHex(accentColor) ? 'border-destructive' : ''}`}
              />
              <div 
                className="h-11 w-11 rounded-xl border-2 border-border shrink-0 transition-colors"
                style={{ backgroundColor: isValidHex(accentColor) ? accentColor : '#3b82f6' }}
              />
            </div>
          </div>
        </div>

        <EmailPreview 
          platformName={platformName || 'RepostFlow'}
          logoUrl={logoUrl}
          primaryColor={isValidHex(primaryColor) ? primaryColor : '#18181b'}
          accentColor={isValidHex(accentColor) ? accentColor : '#3b82f6'}
        />

        <Button 
          onClick={handleSaveBranding} 
          disabled={isUpdating || !isValidHex(primaryColor) || !isValidHex(accentColor)}
          className="w-full h-11"
        >
          {isUpdating ? 'Saving...' : 'Save Branding Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailBrandingSection;
