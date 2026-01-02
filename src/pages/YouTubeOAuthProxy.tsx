import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * OAuth Callback Proxy
 * 
 * Google redirects to /functions/v1/youtube-oauth on our domain after user consent.
 * This component intercepts that request and forwards it to the actual Supabase Edge Function.
 */
const YouTubeOAuthProxy = () => {
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const currentUrl = new URL(window.location.href);
      const searchParams = currentUrl.searchParams;
      
      console.log("[YouTubeOAuthProxy] Intercepted OAuth callback:", {
        pathname: currentUrl.pathname,
        search: currentUrl.search,
        hasCode: searchParams.has("code"),
        hasState: searchParams.has("state"),
      });
      
      // Ensure action=callback is present (Google returns code + state)
      if (!searchParams.has("action") && searchParams.has("code")) {
        searchParams.set("action", "callback");
      }
      
      // Build the real Supabase Edge Function URL with fallback
      let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Fallback: construct URL from project ID if VITE_SUPABASE_URL is missing
      if (!supabaseUrl) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        if (projectId) {
          supabaseUrl = `https://${projectId}.supabase.co`;
          console.log("[YouTubeOAuthProxy] Using fallback Supabase URL:", supabaseUrl);
        }
      }
      
      if (!supabaseUrl) {
        console.error("[YouTubeOAuthProxy] No Supabase URL available");
        setError("Configuration error: Missing Supabase URL");
        return;
      }
      
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/youtube-oauth?${searchParams.toString()}`;
      console.log("[YouTubeOAuthProxy] Redirecting to Edge Function:", edgeFunctionUrl);
      
      setRedirectUrl(edgeFunctionUrl);
      
      // Redirect to the actual edge function
      window.location.replace(edgeFunctionUrl);
    } catch (err) {
      console.error("[YouTubeOAuthProxy] Error processing OAuth callback:", err);
      setError("Failed to process authorization callback");
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">Authorization Error</h1>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        {redirectUrl && (
          <Button asChild variant="outline">
            <a href={redirectUrl}>Try Manual Redirect</a>
          </Button>
        )}
        <Button 
          variant="ghost" 
          className="mt-2"
          onClick={() => window.close()}
        >
          Close Window
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Completing authorization...</p>
      <p className="text-xs text-muted-foreground/60 mt-2">Redirecting to secure server...</p>
    </div>
  );
};

export default YouTubeOAuthProxy;
