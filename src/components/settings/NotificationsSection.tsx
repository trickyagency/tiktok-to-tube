import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, CheckCircle2, XCircle, Video, Calendar, Clock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationsSectionProps {
  preferences: {
    emailOnUploadComplete: boolean;
    emailOnUploadFailed: boolean;
    emailOnNewVideo: boolean;
    emailOnScheduleRun: boolean;
    emailOnExpiry14Days: boolean;
    emailOnExpiry7Days: boolean;
    emailOnExpiry3Days: boolean;
    emailOnExpiry1Day: boolean;
    emailDigestFrequency: 'none' | 'daily' | 'weekly';
  };
  updatePreference: (key: string, value: boolean | string) => void;
  isLoading: boolean;
}

const reminderDays = [
  { days: 14, color: 'emerald' },
  { days: 7, color: 'amber' },
  { days: 3, color: 'orange' },
  { days: 1, color: 'red' },
] as const;

export const NotificationsSection = ({ preferences, updatePreference, isLoading }: NotificationsSectionProps) => {
  return (
    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Email Notifications</CardTitle>
            <CardDescription>Configure which events trigger email alerts</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Upload Events */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <div className="h-1 w-1 rounded-full bg-primary" />
            Upload Events
          </div>
          <div className="rounded-xl border bg-background/50 divide-y">
            <NotificationItem
              icon={CheckCircle2}
              iconClassName="text-green-500"
              title="Upload Completed"
              description="Get notified when a video uploads successfully"
              checked={preferences.emailOnUploadComplete}
              onCheckedChange={(checked) => updatePreference('emailOnUploadComplete', checked)}
              disabled={isLoading}
            />
            <NotificationItem
              icon={XCircle}
              iconClassName="text-destructive"
              title="Upload Failed"
              description="Get notified when an upload fails"
              checked={preferences.emailOnUploadFailed}
              onCheckedChange={(checked) => updatePreference('emailOnUploadFailed', checked)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Content Events */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <div className="h-1 w-1 rounded-full bg-primary" />
            Content Events
          </div>
          <div className="rounded-xl border bg-background/50">
            <NotificationItem
              icon={Video}
              iconClassName="text-primary"
              title="New Video Detected"
              description="Get notified when new TikTok videos are scraped"
              checked={preferences.emailOnNewVideo}
              onCheckedChange={(checked) => updatePreference('emailOnNewVideo', checked)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Schedule Events */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <div className="h-1 w-1 rounded-full bg-primary" />
            Schedule Events
          </div>
          <div className="rounded-xl border bg-background/50">
            <NotificationItem
              icon={Calendar}
              iconClassName="text-primary"
              title="Schedule Completed"
              description="Get notified when a scheduled task finishes"
              checked={preferences.emailOnScheduleRun}
              onCheckedChange={(checked) => updatePreference('emailOnScheduleRun', checked)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Subscription Reminders */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <Clock className="h-3.5 w-3.5" />
            Subscription Reminders
          </div>
          <p className="text-xs text-muted-foreground">
            Receive email reminders before your subscription expires
          </p>
          <div className="flex flex-wrap gap-2">
            {reminderDays.map(({ days, color }) => {
              const prefKey = `emailOnExpiry${days === 1 ? '1Day' : `${days}Days`}` as keyof typeof preferences;
              const isEnabled = preferences[prefKey] as boolean;
              
              return (
                <button
                  key={days}
                  onClick={() => updatePreference(prefKey, !isEnabled)}
                  disabled={isLoading}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                    isEnabled
                      ? `bg-${color}-500/10 border-${color}-500/30 text-${color}-600 dark:text-${color}-400`
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    backgroundColor: isEnabled 
                      ? color === 'emerald' ? 'hsl(var(--chart-2) / 0.1)'
                      : color === 'amber' ? 'hsl(45, 93%, 47%, 0.1)'
                      : color === 'orange' ? 'hsl(25, 95%, 53%, 0.1)'
                      : 'hsl(var(--destructive) / 0.1)'
                      : undefined,
                    borderColor: isEnabled 
                      ? color === 'emerald' ? 'hsl(var(--chart-2) / 0.3)'
                      : color === 'amber' ? 'hsl(45, 93%, 47%, 0.3)'
                      : color === 'orange' ? 'hsl(25, 95%, 53%, 0.3)'
                      : 'hsl(var(--destructive) / 0.3)'
                      : undefined,
                    color: isEnabled
                      ? color === 'emerald' ? 'hsl(142, 71%, 45%)'
                      : color === 'amber' ? 'hsl(45, 93%, 47%)'
                      : color === 'orange' ? 'hsl(25, 95%, 53%)'
                      : 'hsl(var(--destructive))'
                      : undefined
                  }}
                >
                  <span className="font-bold">{days}</span>
                  <span>day{days > 1 ? 's' : ''}</span>
                  {isEnabled && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Email Digest */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <Mail className="h-3.5 w-3.5" />
            Email Digest
          </div>
          <p className="text-xs text-muted-foreground">
            Receive a summary of all activity instead of individual notifications
          </p>
          <RadioGroup
            value={preferences.emailDigestFrequency}
            onValueChange={(value) => updatePreference('emailDigestFrequency', value)}
            disabled={isLoading}
            className="flex flex-col gap-2"
          >
            {[
              { value: 'none', label: 'No digest', description: 'Individual emails only' },
              { value: 'daily', label: 'Daily digest', description: 'Summary every day' },
              { value: 'weekly', label: 'Weekly digest', description: 'Summary every week' },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  preferences.emailDigestFrequency === option.value
                    ? "border-primary/30 bg-primary/5"
                    : "border-transparent bg-muted/30 hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={option.value} id={`digest-${option.value}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};

interface NotificationItemProps {
  icon: React.ElementType;
  iconClassName?: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const NotificationItem = ({
  icon: Icon,
  iconClassName,
  title,
  description,
  checked,
  onCheckedChange,
  disabled
}: NotificationItemProps) => (
  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center">
        <Icon className={cn("h-4 w-4", iconClassName)} />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  </div>
);

export default NotificationsSection;
