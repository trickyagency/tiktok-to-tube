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
      <div className="bg-background rounded-lg p-6 shadow-sm border border-border">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={platformName} 
            className="h-10 mb-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div 
            className="text-xl font-bold mb-4"
            style={{ color: primaryColor }}
          >
            {platformName}
          </div>
        )}
        <h2 
          className="text-lg font-semibold mb-3"
          style={{ color: primaryColor }}
        >
          Welcome to {platformName}!
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          You've been invited to join {platformName}. Click the button below to set up your account.
        </p>
        <button 
          className="px-4 py-2 text-white text-sm font-medium rounded-md transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Set Up Your Account
        </button>
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This invitation expires in 7 days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
