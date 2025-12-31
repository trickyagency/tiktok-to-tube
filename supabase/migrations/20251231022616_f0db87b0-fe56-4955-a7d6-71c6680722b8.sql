-- Create A/B testing tables for comparing posting times

-- Table to store A/B test configurations
CREATE TABLE public.schedule_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  youtube_channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE CASCADE NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed')),
  variant_a_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  variant_b_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  total_uploads_a INTEGER DEFAULT 0,
  total_uploads_b INTEGER DEFAULT 0,
  success_rate_a NUMERIC(5,2) DEFAULT 0,
  success_rate_b NUMERIC(5,2) DEFAULT 0,
  winner TEXT CHECK (winner IN ('a', 'b') OR winner IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track which uploads belong to which test variant
CREATE TABLE public.ab_test_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES public.schedule_ab_tests(id) ON DELETE CASCADE NOT NULL,
  upload_log_id UUID REFERENCES public.upload_logs(id) ON DELETE CASCADE NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ab_test_id, upload_log_id)
);

-- Enable RLS
ALTER TABLE public.schedule_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for schedule_ab_tests
CREATE POLICY "Users can view their own A/B tests" 
ON public.schedule_ab_tests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own A/B tests" 
ON public.schedule_ab_tests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own A/B tests" 
ON public.schedule_ab_tests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own A/B tests" 
ON public.schedule_ab_tests 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for ab_test_uploads (through the parent A/B test)
CREATE POLICY "Users can view uploads for their own A/B tests" 
ON public.ab_test_uploads 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.schedule_ab_tests 
    WHERE id = ab_test_uploads.ab_test_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create uploads for their own A/B tests" 
ON public.ab_test_uploads 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.schedule_ab_tests 
    WHERE id = ab_test_uploads.ab_test_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete uploads for their own A/B tests" 
ON public.ab_test_uploads 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.schedule_ab_tests 
    WHERE id = ab_test_uploads.ab_test_id 
    AND user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_schedule_ab_tests_updated_at
BEFORE UPDATE ON public.schedule_ab_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_schedule_ab_tests_user_id ON public.schedule_ab_tests(user_id);
CREATE INDEX idx_schedule_ab_tests_status ON public.schedule_ab_tests(status);
CREATE INDEX idx_ab_test_uploads_ab_test_id ON public.ab_test_uploads(ab_test_id);
CREATE INDEX idx_ab_test_uploads_variant ON public.ab_test_uploads(variant);