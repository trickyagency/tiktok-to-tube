-- Create subscription_history table for tracking subscription changes
CREATE TABLE public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'renewed', 'upgraded', 'downgraded', 'cancelled', 'expired', 'updated'
  plan_id TEXT,
  account_count INTEGER,
  previous_plan_id TEXT,
  previous_account_count INTEGER,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription history
CREATE POLICY "Users can view their own subscription history" 
ON public.subscription_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Owner can view all subscription history
CREATE POLICY "Owner can view all subscription history" 
ON public.subscription_history 
FOR SELECT 
USING (is_owner(auth.uid()));

-- Owner can manage all subscription history
CREATE POLICY "Owner can manage all subscription history" 
ON public.subscription_history 
FOR ALL 
USING (is_owner(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON public.subscription_history(created_at DESC);