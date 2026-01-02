import { cn } from '@/lib/utils';
import { User, Shield, Key, Mail, Bell, AlertTriangle } from 'lucide-react';

export type SettingsSection = 'profile' | 'security' | 'api-keys' | 'email-branding' | 'notifications' | 'danger';

interface SettingsNavProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  isOwner: boolean;
}

const sections = [
  { id: 'profile' as const, label: 'Profile', icon: User, ownerOnly: false },
  { id: 'security' as const, label: 'Security', icon: Shield, ownerOnly: false },
  { id: 'api-keys' as const, label: 'API Keys', icon: Key, ownerOnly: true },
  { id: 'email-branding' as const, label: 'Email Branding', icon: Mail, ownerOnly: true },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell, ownerOnly: false },
  { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle, ownerOnly: false, isDanger: true },
];

export const SettingsNav = ({ activeSection, onSectionChange, isOwner }: SettingsNavProps) => {
  const visibleSections = sections.filter(s => !s.ownerOnly || isOwner);

  return (
    <nav className="flex flex-col gap-1">
      {visibleSections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
              isActive
                ? section.isDanger
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary shadow-sm"
                : section.isDanger
                  ? "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              isActive
                ? section.isDanger
                  ? "bg-destructive/10"
                  : "bg-primary/10"
                : "bg-transparent"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span>{section.label}</span>
            {section.ownerOnly && (
              <span className="ml-auto text-[10px] uppercase tracking-wide bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                Owner
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default SettingsNav;
