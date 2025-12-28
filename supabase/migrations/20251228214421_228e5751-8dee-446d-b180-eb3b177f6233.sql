-- Create subscription_plans table (reference table for plan details)
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  max_videos_per_day INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the three plans
INSERT INTO public.subscription_plans (id, name, price_monthly, max_videos_per_day, features, is_active) VALUES 
  ('basic', 'Basic', 700, 2, '{"watermark_free": true, "auto_upload": true, "basic_seo": true}', true),
  ('pro', 'Pro', 1200, 4, '{"watermark_free": true, "auto_upload": true, "advanced_seo": true, "auto_scheduling": true, "faster_processing": true, "reupload_protection": true}', true),
  ('scale', 'Scale', 1800, 6, '{"watermark_free": true, "auto_upload": true, "smart_seo": true, "best_posting_time": true, "duplicate_detection": true, "priority_processing": true, "growth_optimization": true}', true);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans (public pricing)
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (true);

-- Only owner can manage plans
CREATE POLICY "Owner can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (is_owner(auth.uid()));

-- Create account_subscriptions table
CREATE TABLE public.account_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  activated_by UUID,
  activated_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,
  payment_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tiktok_account_id)
);

-- Enable RLS on account_subscriptions
ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.account_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create subscription requests for their own accounts
CREATE POLICY "Users can create their own subscription requests"
ON public.account_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending subscriptions (e.g., cancel request)
CREATE POLICY "Users can update their own pending subscriptions"
ON public.account_subscriptions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Owner can view all subscriptions
CREATE POLICY "Owner can view all subscriptions"
ON public.account_subscriptions
FOR SELECT
USING (is_owner(auth.uid()));

-- Owner can manage all subscriptions
CREATE POLICY "Owner can manage all subscriptions"
ON public.account_subscriptions
FOR ALL
USING (is_owner(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_account_subscriptions_updated_at
BEFORE UPDATE ON public.account_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();