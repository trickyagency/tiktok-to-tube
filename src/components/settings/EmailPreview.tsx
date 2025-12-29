import { Mail } from 'lucide-react';

interface EmailPreviewProps {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

const EmailPreview = ({ platformName, logoUrl, primaryColor, accentColor }: EmailPreviewProps) => {
  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Mail className="h-4 w-4" />
        Email Preview
      </div>
      
      {/* Email Container */}
      <div className="bg-slate-100 rounded-lg p-4">
        <div className="max-w-md mx-auto">
          
          {/* Header with Gradient */}
          <div 
            className="rounded-t-xl p-6 text-center"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={platformName} 
                className="h-8 mx-auto mb-2 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="text-xl font-bold text-white mb-1">
                🎬 {platformName}
              </div>
            )}
            <div className="text-white/80 text-xs">
              TikTok → YouTube Automation
            </div>
          </div>
          
          {/* Content Area */}
          <div className="bg-background rounded-b-xl p-5 shadow-sm border border-border">
            
            {/* Title with Badge */}
            <h2 
              className="text-lg font-bold mb-2"
              style={{ color: primaryColor }}
            >
              You're Invited! 🎉
            </h2>
            <span 
              className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3"
              style={{ 
                background: `linear-gradient(135deg, ${accentColor}, #6366f1)`,
                color: 'white'
              }}
            >
              ADMIN ACCESS
            </span>
            
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              Welcome! You've been invited to join <strong style={{ color: primaryColor }}>{platformName}</strong>. 
              We're excited to have you on board.
            </p>
            
            {/* Info Card */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border">
              <div 
                className="font-semibold text-xs mb-2"
                style={{ color: primaryColor }}
              >
                📬 Check Your Inbox
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You'll receive a separate email with your secure account setup link.
              </p>
            </div>
            
            {/* Features */}
            <div className="mb-4">
              <div 
                className="font-semibold text-xs mb-2"
                style={{ color: primaryColor }}
              >
                ✨ What you'll be able to do:
              </div>
              <div className="space-y-1.5">
                {['Connect TikTok accounts', 'Scrape & download videos', 'Schedule YouTube uploads'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[8px] text-green-600 font-bold">
                      ✓
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Expiry Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-3 border-l-4 border-amber-500">
              <p className="text-[11px] text-amber-800 dark:text-amber-200">
                <strong>⏰ Note:</strong> This invitation expires in 7 days.
              </p>
            </div>
            
            {/* Divider */}
            <div className="border-t border-border my-4" />
            
            {/* Footer Note */}
            <p className="text-[11px] text-muted-foreground/70">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          {/* Footer */}
          <div className="text-center py-4">
            <p 
              className="text-xs font-semibold"
              style={{ color: primaryColor }}
            >
              {platformName}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Powered by Digital Automators
            </p>
            <p className="text-[9px] text-muted-foreground/60 mt-2">
              © {new Date().getFullYear()} {platformName}. All rights reserved.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
