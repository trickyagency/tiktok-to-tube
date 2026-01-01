import { Youtube, Plus, Key, CheckCircle2, Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface YouTubeEmptyStateProps {
  onAddChannel: () => void;
}

export const YouTubeEmptyState = ({ onAddChannel }: YouTubeEmptyStateProps) => {
  const steps = [
    {
      icon: Key,
      title: "Add OAuth Credentials",
      description: "Enter your Google Cloud OAuth client ID and secret",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: CheckCircle2,
      title: "Authorize Channel",
      description: "Complete the Google authorization flow",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Upload,
      title: "Start Uploading",
      description: "Link TikTok accounts and upload videos to YouTube",
      color: "from-red-500 to-orange-500",
    },
  ];

  return (
    <Card className={cn(
      "relative overflow-hidden",
      "border-2 border-dashed border-border/60",
      "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
      "backdrop-blur-xl",
      "shadow-xl shadow-black/5"
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-red-500/3 to-primary/3 rounded-full blur-3xl" />
      </div>

      <CardContent className="relative flex flex-col items-center justify-center py-16 px-6">
        {/* Icon with Premium Styling */}
        <div className="relative mb-8 group">
          {/* Outer glow ring */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Icon container */}
          <div className={cn(
            "relative w-24 h-24 rounded-2xl",
            "bg-gradient-to-br from-red-500 to-red-600",
            "flex items-center justify-center",
            "shadow-xl shadow-red-500/25",
            "transform transition-transform duration-300 group-hover:scale-105"
          )}>
            <Youtube className="h-12 w-12 text-white" />
            
            {/* Sparkle accent */}
            <div className={cn(
              "absolute -top-2 -right-2 w-8 h-8 rounded-full",
              "bg-gradient-to-br from-amber-400 to-orange-500",
              "flex items-center justify-center",
              "shadow-lg shadow-amber-500/30",
              "animate-pulse"
            )}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="text-2xl font-bold mb-3 text-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          Connect Your YouTube Channel
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
          Add a YouTube channel to start uploading TikTok videos automatically. 
          You'll need Google Cloud OAuth credentials to get started.
        </p>

        {/* Add Button */}
        <Button 
          onClick={onAddChannel} 
          size="lg" 
          className={cn(
            "mb-12 gap-2 px-8 h-12 text-base font-semibold",
            "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
            "shadow-xl shadow-red-500/25 hover:shadow-red-500/40",
            "transform transition-all duration-300 hover:scale-105",
            "group"
          )}
        >
          <Plus className="h-5 w-5" />
          Add YouTube Channel
          <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
        </Button>

        {/* Steps Guide */}
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-sm font-medium text-muted-foreground px-3">How it works</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "group relative flex flex-col items-center text-center p-6 rounded-2xl",
                  "bg-gradient-to-br from-muted/50 to-muted/20",
                  "border border-border/50",
                  "hover:border-primary/30 hover:shadow-lg",
                  "transition-all duration-300"
                )}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Step Number */}
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2",
                  "w-7 h-7 rounded-full",
                  "bg-gradient-to-r",
                  step.color,
                  "text-white text-sm font-bold",
                  "flex items-center justify-center",
                  "shadow-lg"
                )}>
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={cn(
                  "relative w-14 h-14 rounded-xl mb-4 mt-2",
                  "bg-gradient-to-br from-background to-muted/50",
                  "border border-border/50",
                  "flex items-center justify-center",
                  "group-hover:scale-110 transition-transform duration-300"
                )}>
                  <step.icon className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                
                {/* Content */}
                <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {/* Connector Line (hidden on last item and mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-border to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
