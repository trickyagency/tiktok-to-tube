import { Youtube, Plus, Key, CheckCircle2, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface YouTubeEmptyStateProps {
  onAddChannel: () => void;
}

export const YouTubeEmptyState = ({ onAddChannel }: YouTubeEmptyStateProps) => {
  const steps = [
    {
      icon: Key,
      title: "Add OAuth Credentials",
      description: "Enter your Google Cloud OAuth client ID and secret",
    },
    {
      icon: CheckCircle2,
      title: "Authorize Channel",
      description: "Complete the Google authorization flow",
    },
    {
      icon: Upload,
      title: "Start Uploading",
      description: "Link TikTok accounts and upload videos to YouTube",
    },
  ];

  return (
    <Card className="border-dashed border-2 bg-card/30 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        {/* Icon with sparkle */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
            <Youtube className="h-10 w-10 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
        </div>

        {/* Title and description */}
        <h3 className="text-xl font-semibold mb-2 text-center">
          Connect Your YouTube Channel
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Add a YouTube channel to start uploading TikTok videos automatically. 
          You'll need Google Cloud OAuth credentials to get started.
        </p>

        {/* Add button */}
        <Button onClick={onAddChannel} size="lg" className="mb-10">
          <Plus className="h-4 w-4 mr-2" />
          Add YouTube Channel
        </Button>

        {/* Steps guide */}
        <div className="w-full max-w-2xl">
          <p className="text-sm font-medium text-center mb-4 text-muted-foreground">
            How it works
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center mb-3 mt-2">
                  <step.icon className="h-6 w-6 text-muted-foreground" />
                </div>
                
                {/* Content */}
                <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
