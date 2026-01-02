import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import SettingsNav, { SettingsSection } from '@/components/settings/SettingsNav';
import ProfileSection from '@/components/settings/ProfileSection';
import SecuritySettings from '@/components/settings/SecuritySettings';
import ApiKeysSection from '@/components/settings/ApiKeysSection';
import EmailBrandingSection from '@/components/settings/EmailBrandingSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import DangerZoneSection from '@/components/settings/DangerZoneSection';

const Settings = () => {
  const { user, isOwner } = useAuth();
  const { preferences, updatePreference, isLoading: preferencesLoading } = useEmailPreferences();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  useEffect(() => {
    document.title = "Settings | RepostFlow";
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection user={user} />;
      case 'security':
        return <SecuritySettings />;
      case 'api-keys':
        return isOwner ? <ApiKeysSection /> : null;
      case 'email-branding':
        return isOwner ? <EmailBrandingSection /> : null;
      case 'notifications':
        return (
          <NotificationsSection
            preferences={preferences}
            updatePreference={updatePreference}
            isLoading={preferencesLoading}
          />
        );
      case 'danger':
        return !isOwner ? <DangerZoneSection /> : null;
      default:
        return <ProfileSection user={user} />;
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your account and preferences"
    >
      {/* Page Header with Save Status */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span>Auto-saved</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl">
        {/* Sidebar Navigation - Desktop */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-6">
            {/* Mobile: Horizontal Scrolling Tabs */}
            <div className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex gap-2 min-w-max">
                {[
                  { id: 'profile' as const, label: 'Profile' },
                  { id: 'security' as const, label: 'Security' },
                  ...(isOwner ? [
                    { id: 'api-keys' as const, label: 'API Keys' },
                    { id: 'email-branding' as const, label: 'Branding' },
                  ] : []),
                  { id: 'notifications' as const, label: 'Notifications' },
                  ...(!isOwner ? [{ id: 'danger' as const, label: 'Danger Zone' }] : []),
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      activeSection === section.id
                        ? section.id === 'danger'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: Vertical Navigation */}
            <div className="hidden lg:block p-4 rounded-2xl bg-muted/30 border">
              <SettingsNav
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                isOwner={isOwner}
              />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="animate-fade-in">
            {renderSection()}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
