-- Add billing_interval column to user_subscriptions table
ALTER TABLE user_subscriptions 
  ADD COLUMN billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly'));