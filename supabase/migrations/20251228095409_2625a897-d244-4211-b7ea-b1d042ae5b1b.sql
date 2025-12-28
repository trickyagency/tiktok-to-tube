-- Add account_status column to track if account is private/deleted
ALTER TABLE public.tiktok_accounts 
ADD COLUMN account_status text NOT NULL DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN public.tiktok_accounts.account_status IS 'Status of the TikTok account: active, private, deleted, not_found';