-- Create pending_invitations table to track user invitations
CREATE TABLE public.pending_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  invited_by uuid NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'admin')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Create unique index on email for pending invitations only
CREATE UNIQUE INDEX pending_invitations_email_pending_idx 
ON public.pending_invitations (email) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Owner can view all pending invitations
CREATE POLICY "Owner can view all pending invitations"
ON public.pending_invitations
FOR SELECT
USING (is_owner(auth.uid()));

-- Owner can insert pending invitations
CREATE POLICY "Owner can insert pending invitations"
ON public.pending_invitations
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

-- Owner can update pending invitations
CREATE POLICY "Owner can update pending invitations"
ON public.pending_invitations
FOR UPDATE
USING (is_owner(auth.uid()));

-- Owner can delete pending invitations
CREATE POLICY "Owner can delete pending invitations"
ON public.pending_invitations
FOR DELETE
USING (is_owner(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_pending_invitations_updated_at
BEFORE UPDATE ON public.pending_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();