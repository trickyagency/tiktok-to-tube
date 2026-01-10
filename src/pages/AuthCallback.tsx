import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    document.title = "Confirming Email | RepostFlow";
    
    // Check if there are tokens in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const errorCode = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    // Handle error in URL
    if (errorCode) {
      setError(errorDescription || 'The confirmation link is invalid or has expired.');
      setProcessing(false);
      return;
    }
    
    // If no tokens in hash, check if already authenticated
    if (!accessToken) {
      // Check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/dashboard', { replace: true });
        } else {
          setError('No confirmation token found. Please try clicking the link in your email again.');
          setProcessing(false);
        }
      });
      return;
    }
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth callback event:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // Successfully authenticated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        navigate('/dashboard', { replace: true });
      }
    });
    
    // Set a timeout for the process
    const timeout = setTimeout(() => {
      if (processing) {
        setError('Confirmation is taking longer than expected. Please try again or contact support.');
        setProcessing(false);
      }
    }, 15000);
    
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, processing]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Confirmation Failed</h1>
              <p className="text-muted-foreground">
                {error}
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth', { replace: true })}
                className="w-full gradient-primary text-white border-0"
              >
                Go to Sign In
              </Button>
              <p className="text-sm text-muted-foreground">
                Need a new confirmation email? Sign up again with the same email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full gradient-primary">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Confirming your email...</h1>
            <p className="text-muted-foreground">
              Please wait while we verify your account.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
