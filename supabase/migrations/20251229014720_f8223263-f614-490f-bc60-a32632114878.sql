-- Update subscription plan prices from cents to dollars
UPDATE subscription_plans SET price_monthly = 7 WHERE id = 'basic';
UPDATE subscription_plans SET price_monthly = 12 WHERE id = 'pro';
UPDATE subscription_plans SET price_monthly = 18 WHERE id = 'scale';