-- Create channel rotation pools table
CREATE TABLE public.channel_rotation_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rotation_strategy TEXT NOT NULL DEFAULT 'quota_based', -- 'quota_based', 'round_robin', 'priority'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create channel pool members table
CREATE TABLE public.channel_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.channel_rotation_pools(id) ON DELETE CASCADE,
  youtube_channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  is_fallback_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, youtube_channel_id)
);

-- Add pool reference to publish_schedules
ALTER TABLE public.publish_schedules
ADD COLUMN channel_pool_id UUID REFERENCES public.channel_rotation_pools(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.channel_rotation_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_pool_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for channel_rotation_pools
CREATE POLICY "Users can view their own pools"
ON public.channel_rotation_pools FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pools"
ON public.channel_rotation_pools FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pools"
ON public.channel_rotation_pools FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pools"
ON public.channel_rotation_pools FOR DELETE
USING (auth.uid() = user_id);

-- Owners can view all pools
CREATE POLICY "Owners can view all pools"
ON public.channel_rotation_pools FOR SELECT
USING (public.is_owner(auth.uid()));

-- RLS policies for channel_pool_members
CREATE POLICY "Users can view members of their pools"
ON public.channel_pool_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channel_rotation_pools
    WHERE id = pool_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can add members to their pools"
ON public.channel_pool_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channel_rotation_pools
    WHERE id = pool_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update members of their pools"
ON public.channel_pool_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.channel_rotation_pools
    WHERE id = pool_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove members from their pools"
ON public.channel_pool_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.channel_rotation_pools
    WHERE id = pool_id AND user_id = auth.uid()
  )
);

-- Owners can manage all pool members
CREATE POLICY "Owners can view all pool members"
ON public.channel_pool_members FOR SELECT
USING (public.is_owner(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_channel_pool_members_pool_id ON public.channel_pool_members(pool_id);
CREATE INDEX idx_channel_pool_members_channel_id ON public.channel_pool_members(youtube_channel_id);
CREATE INDEX idx_publish_schedules_pool_id ON public.publish_schedules(channel_pool_id);

-- Update trigger for pools
CREATE TRIGGER update_channel_rotation_pools_updated_at
BEFORE UPDATE ON public.channel_rotation_pools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();