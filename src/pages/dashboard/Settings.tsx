import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, User, Bell, Key, Eye, EyeOff, Mail, Palette, CheckCircle2, XCircle, Video, Calendar, Loader2, AlertTriangle, Trash2, Camera, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import { useTestApifyKey, ApifyStatus } from '@/hooks/useApifyStatus';
import { toast } from 'sonner';
import EmailPreview from '@/components/settings/EmailPreview';
import SecuritySettings from '@/components/settings/SecuritySettings';
import { supabase } from '@/integrations/supabase/client';
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

const Settings = () => {
  const { user, isOwner } = useAuth();
  const { getSetting, updateSetting, deleteSetting, isUpdating, isDeleting, isLoading } = usePlatformSettings();
  const { preferences, updatePreference, isLoading: preferencesLoading } = useEmailPreferences();
  
  
  const [apifyApiKey, setApifyApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ status: ApifyStatus; message: string } | null>(null);
  const { testKey } = useTestApifyKey();
  const [hasSavedKey, setHasSavedKey] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  
  // Account deletion state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Email branding state
  const [platformName, setPlatformName] = useState('RepostFlow');
  const [senderName, setSenderName] = useState('RepostFlow');
  const [senderEmail, setSenderEmail] = useState('notifications@repostflow.digitalautomators.com');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#18181b');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  
  // Sync fullName and avatar from user data
  useEffect(() => {
    document.title = "Settings | RepostFlow";
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
    // Fetch avatar from profiles table
    const fetchAvatar = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user]);

  useEffect(() => {
    if (isOwner && !isLoading) {
      const savedKey = getSetting('apify_api_key');
      if (savedKey) {
        setApifyApiKey(savedKey);
        setHasSavedKey(true);
      } else {
        setHasSavedKey(false);
      }
      
      // Load email branding settings
      setPlatformName(getSetting('EMAIL_PLATFORM_NAME') || 'RepostFlow');
      setSenderName(getSetting('EMAIL_SENDER_NAME') || 'RepostFlow');
      setSenderEmail(getSetting('EMAIL_SENDER_ADDRESS') || 'onboarding@resend.dev');
      setLogoUrl(getSetting('EMAIL_LOGO_URL') || '');
      setPrimaryColor(getSetting('EMAIL_PRIMARY_COLOR') || '#18181b');
      setAccentColor(getSetting('EMAIL_ACCENT_COLOR') || '#3b82f6');
    }
  }, [isOwner, isLoading, getSetting]);

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
      // Test the key currently in the input field
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

  const handleSaveBranding = () => {
    updateSetting('EMAIL_PLATFORM_NAME', platformName.trim() || 'RepostFlow');
    updateSetting('EMAIL_SENDER_NAME', senderName.trim() || 'RepostFlow');
    updateSetting('EMAIL_SENDER_ADDRESS', senderEmail.trim() || 'onboarding@resend.dev');
    updateSetting('EMAIL_LOGO_URL', logoUrl.trim());
    updateSetting('EMAIL_PRIMARY_COLOR', primaryColor);
    updateSetting('EMAIL_ACCENT_COLOR', accentColor);
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });
      
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleEmailChange = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast.error('New email must be different from current email');
      return;
    }

    setIsChangingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-change', {
        body: { newEmail: newEmail.trim() }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Verification email sent', {
        description: 'Check your new email inbox and click the verification link to confirm the change.'
      });
      setShowEmailChange(false);
      setNewEmail('');
    } catch (error: any) {
      console.error('Failed to change email:', error);
      toast.error('Failed to change email', {
        description: error.message || 'Please try again later'
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('delete-own-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete account');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Account deleted successfully');
      
      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account', {
        description: error.message || 'Please try again later'
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;

    setIsUploadingAvatar(true);
    try {
      // List and delete all files in user's avatar folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const filesToDelete = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Clear avatar URL in profiles
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      setAvatarUrl(null);
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getUserInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
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
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={avatarUrl || ''} alt="Profile picture" />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
              <div>
                <p className="font-medium">Profile Picture</p>
                <p className="text-sm text-muted-foreground">Click to upload (max 2MB)</p>
                {avatarUrl && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-destructive hover:text-destructive mt-1"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input id="email" value={user?.email || ''} disabled className="flex-1" />
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailChange(!showEmailChange)}
                >
                  {showEmailChange ? 'Cancel' : 'Change'}
                </Button>
              </div>
              
              {showEmailChange && (
                <div className="mt-3 p-4 border rounded-lg bg-muted/50 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">New Email Address</Label>
                    <Input 
                      id="new-email" 
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter your new email address"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A verification link will be sent to your new email address. You'll need to click the link to confirm the change.
                  </p>
                  <Button 
                    onClick={handleEmailChange}
                    disabled={isChangingEmail || !newEmail.trim()}
                  >
                    {isChangingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Verification Email'
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <Button 
              onClick={handleUpdateProfile} 
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <SecuritySettings />

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
                <div className="space-y-3">
                  <Label htmlFor="scraper-key">Scraper API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        id="scraper-key" 
                        type={showApiKey ? 'text' : 'password'}
                        value={apifyApiKey}
                        onChange={(e) => {
                          setApifyApiKey(e.target.value);
                          setKeyTestResult(null); // Clear result when key changes
                        }}
                        placeholder="Enter your scraper API key"
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
                    <Button 
                      variant="outline" 
                      onClick={handleTestApiKey} 
                      disabled={isTestingKey || !apifyApiKey.trim()}
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
                    <Button onClick={handleSaveApiKey} disabled={isUpdating || !apifyApiKey.trim()}>
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                    {hasSavedKey && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" disabled={isDeleting}>
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
                  
                  {/* Test Result Display */}
                  {keyTestResult && (
                    <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                      keyTestResult.status === 'valid' 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {keyTestResult.status === 'valid' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
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
                      placeholder="RepostFlow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input 
                      id="sender-name" 
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="RepostFlow"
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
                  platformName={platformName || 'RepostFlow'}
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
              Email Notifications
            </CardTitle>
            <CardDescription>Configure which events trigger email alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Events */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Upload Events</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div className="space-y-0.5">
                      <Label htmlFor="upload-complete" className="text-sm font-medium cursor-pointer">
                        Upload Completed
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when a video uploads successfully
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="upload-complete"
                    checked={preferences.emailOnUploadComplete}
                    onCheckedChange={(checked) => updatePreference('emailOnUploadComplete', checked)}
                    disabled={preferencesLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <div className="space-y-0.5">
                      <Label htmlFor="upload-failed" className="text-sm font-medium cursor-pointer">
                        Upload Failed
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when an upload fails
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="upload-failed"
                    checked={preferences.emailOnUploadFailed}
                    onCheckedChange={(checked) => updatePreference('emailOnUploadFailed', checked)}
                    disabled={preferencesLoading}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Content Events */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Content Events</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="h-4 w-4 text-primary" />
                  <div className="space-y-0.5">
                    <Label htmlFor="new-video" className="text-sm font-medium cursor-pointer">
                      New Video Detected
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when new TikTok videos are scraped
                    </p>
                  </div>
                </div>
                <Switch
                  id="new-video"
                  checked={preferences.emailOnNewVideo}
                  onCheckedChange={(checked) => updatePreference('emailOnNewVideo', checked)}
                  disabled={preferencesLoading}
                />
              </div>
            </div>

            <Separator />

            {/* Schedule Events */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Schedule Events</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div className="space-y-0.5">
                    <Label htmlFor="schedule-run" className="text-sm font-medium cursor-pointer">
                      Schedule Completed
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when a scheduled task finishes
                    </p>
                  </div>
                </div>
                <Switch
                  id="schedule-run"
                  checked={preferences.emailOnScheduleRun}
                  onCheckedChange={(checked) => updatePreference('emailOnScheduleRun', checked)}
                  disabled={preferencesLoading}
                />
              </div>
            </div>

            <Separator />

            {/* Digest Frequency */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Email Digest</h4>
              <p className="text-xs text-muted-foreground">
                Receive a summary of all activity instead of individual notifications
              </p>
              <RadioGroup
                value={preferences.emailDigestFrequency}
                onValueChange={(value) => updatePreference('emailDigestFrequency', value as 'none' | 'daily' | 'weekly')}
                disabled={preferencesLoading}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="digest-none" />
                  <Label htmlFor="digest-none" className="cursor-pointer">No digest (individual emails only)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="digest-daily" />
                  <Label htmlFor="digest-daily" className="cursor-pointer">Daily digest</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="digest-weekly" />
                  <Label htmlFor="digest-weekly" className="cursor-pointer">Weekly digest</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - Account Deletion */}
        {!isOwner && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">This will delete:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Your profile and settings</li>
                    <li>All TikTok accounts</li>
                    <li>All YouTube channels</li>
                    <li>All scraped videos</li>
                    <li>All upload history</li>
                    <li>All schedules and queue items</li>
                    <li>All subscription data</li>
                  </ul>
                </div>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <span className="block">
                          This action is permanent and cannot be undone. All your data will be permanently deleted.
                        </span>
                        <span className="block font-medium">
                          Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm:
                        </span>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE to confirm"
                          className="mt-2"
                        />
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                        Cancel
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                      >
                        {isDeletingAccount ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Account'
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
