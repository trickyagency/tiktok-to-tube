import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Camera, X, Loader2, Mail, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileSectionProps {
  user: SupabaseUser | null;
}

export const ProfileSection = ({ user }: ProfileSectionProps) => {
  const [fullName, setFullName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
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

  const getUserInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const filesToDelete = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

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

  return (
    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Two Column Layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar Column */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/10">
                <AvatarImage src={avatarUrl || ''} alt="Profile picture" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-2xl font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200 backdrop-blur-sm">
                {isUploadingAvatar ? (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                ) : (
                  <Camera className="h-7 w-7 text-white" />
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
            <div className="text-center">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">Max 2MB</p>
            </div>
            {avatarUrl && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Remove Photo
              </Button>
            )}
          </div>

          {/* Form Column */}
          <div className="flex-1 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Full Name
              </Label>
              <Input 
                id="name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="h-11 bg-background/50"
              />
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Email Address
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="flex-1 h-11 bg-muted/30" 
                />
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailChange(!showEmailChange)}
                  className="h-11 px-4"
                >
                  {showEmailChange ? 'Cancel' : 'Change'}
                </Button>
              </div>
              
              {showEmailChange && (
                <div className="mt-4 p-4 rounded-xl border bg-muted/20 space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="new-email" className="text-sm">New Email Address</Label>
                    <Input 
                      id="new-email" 
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter your new email address"
                      className="h-11 bg-background/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A verification link will be sent to your new email address.
                  </p>
                  <Button 
                    onClick={handleEmailChange}
                    disabled={isChangingEmail || !newEmail.trim()}
                    className="w-full h-10"
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

            <Button 
              onClick={handleUpdateProfile} 
              disabled={isUpdatingProfile}
              className="w-full md:w-auto h-11 px-8"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSection;
