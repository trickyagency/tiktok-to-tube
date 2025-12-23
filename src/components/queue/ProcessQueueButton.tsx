import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessQueueButtonProps {
  onComplete?: () => void;
}

export function ProcessQueueButton({ onComplete }: ProcessQueueButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-queue');

      if (error) {
        throw error;
      }

      if (data?.processed > 0) {
        toast.success(`Processing ${data.processed} video(s)...`);
      } else if (data?.message) {
        toast.info(data.message);
      } else {
        toast.info('No videos ready for processing');
      }

      onComplete?.();
    } catch (error: any) {
      console.error('Process queue error:', error);
      toast.error(`Failed to process queue: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleProcess}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Play className="h-4 w-4 mr-2" />
          Process Queue Now
        </>
      )}
    </Button>
  );
}
