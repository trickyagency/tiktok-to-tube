import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './OverviewTab';
import { UsageTab } from './UsageTab';
import { BillingTab } from './BillingTab';
import { SubscriptionHistoryCard } from './SubscriptionHistoryCard';
import { 
  LayoutDashboard, 
  BarChart3, 
  CreditCard,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionTabsProps {
  subscription: any;
  limits: any;
  accounts: any[];
  accountsLoading: boolean;
  isOwner: boolean;
  planId: string;
  planName: string;
  gradient: string;
  features: string[];
  PlanIcon: any;
  daysRemaining: number | null;
  expiresAt: Date | null;
  isExpiringSoon: boolean;
  usedAccounts: number;
  maxAccounts: number;
  isUnlimited: boolean;
  onContactSupport: () => void;
  onRequestUpgrade: () => void;
}

export function SubscriptionTabs({
  subscription,
  limits,
  accounts,
  accountsLoading,
  isOwner,
  planId,
  planName,
  gradient,
  features,
  PlanIcon,
  daysRemaining,
  expiresAt,
  isExpiringSoon,
  usedAccounts,
  maxAccounts,
  isUnlimited,
  onContactSupport,
  onRequestUpgrade
}: SubscriptionTabsProps) {
  const tabItems = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'usage', label: 'Usage', icon: BarChart3 },
    { value: 'billing', label: 'Billing', icon: CreditCard },
    { value: 'history', label: 'History', icon: History },
  ];

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full h-auto p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1">
        {tabItems.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "data-[state=active]:bg-background data-[state=active]:shadow-sm",
              "data-[state=active]:border data-[state=active]:border-border/50",
              "transition-all duration-200"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6">
        <TabsContent value="overview" className="m-0 focus-visible:outline-none">
          <OverviewTab
            subscription={subscription}
            limits={limits}
            accounts={accounts}
            accountsLoading={accountsLoading}
            isOwner={isOwner}
            planId={planId}
            planName={planName}
            gradient={gradient}
            features={features}
            PlanIcon={PlanIcon}
            daysRemaining={daysRemaining}
            expiresAt={expiresAt}
            isExpiringSoon={isExpiringSoon}
            usedAccounts={usedAccounts}
            maxAccounts={maxAccounts}
            isUnlimited={isUnlimited}
            onContactSupport={onContactSupport}
          />
        </TabsContent>

        <TabsContent value="usage" className="m-0 focus-visible:outline-none">
          <UsageTab 
            accounts={accounts}
            usedAccounts={usedAccounts}
            maxAccounts={maxAccounts}
            isUnlimited={isUnlimited}
          />
        </TabsContent>

        <TabsContent value="billing" className="m-0 focus-visible:outline-none">
          <BillingTab
            subscription={subscription}
            planName={planName}
            expiresAt={expiresAt}
            daysRemaining={daysRemaining}
            isOwner={isOwner}
            onRequestUpgrade={onRequestUpgrade}
          />
        </TabsContent>

        <TabsContent value="history" className="m-0 focus-visible:outline-none">
          <SubscriptionHistoryCard />
        </TabsContent>
      </div>
    </Tabs>
  );
}
