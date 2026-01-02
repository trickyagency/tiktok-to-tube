import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Plus, 
  MessageCircle, 
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import { generateGeneralWhatsAppLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  canAddAccount: boolean;
  isOwner: boolean;
  className?: string;
}

export function QuickActionsBar({ canAddAccount, isOwner, className }: QuickActionsBarProps) {
  const handleContactSupport = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const actions = [
    ...(isOwner ? [] : [{
      label: 'Upgrade Plan',
      icon: Sparkles,
      href: '/dashboard/upgrade',
      variant: 'default' as const,
      gradient: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0'
    }]),
    ...(canAddAccount ? [{
      label: 'Add Account',
      icon: Plus,
      href: '/dashboard/tiktok-accounts',
      variant: 'outline' as const,
      gradient: ''
    }] : []),
    {
      label: 'View Analytics',
      icon: BarChart3,
      href: '/dashboard/analytics',
      variant: 'outline' as const,
      gradient: ''
    },
    {
      label: 'Support',
      icon: MessageCircle,
      onClick: handleContactSupport,
      variant: 'outline' as const,
      gradient: ''
    },
  ];

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 p-3 rounded-xl",
      "bg-muted/30 backdrop-blur-sm border border-border/50",
      className
    )}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2 hidden sm:inline">
        Quick Actions
      </span>
      
      {actions.map((action, index) => (
        action.onClick ? (
          <Button
            key={index}
            variant={action.variant}
            size="sm"
            onClick={action.onClick}
            className={cn("gap-1.5", action.gradient)}
          >
            <action.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        ) : (
          <Button
            key={index}
            asChild
            variant={action.variant}
            size="sm"
            className={cn("gap-1.5", action.gradient)}
          >
            <Link to={action.href!}>
              <action.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{action.label}</span>
            </Link>
          </Button>
        )
      ))}
    </div>
  );
}
