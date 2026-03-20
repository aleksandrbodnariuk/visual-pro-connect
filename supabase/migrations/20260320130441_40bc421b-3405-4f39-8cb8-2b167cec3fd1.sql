
-- Create representatives table
CREATE TABLE public.representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL CHECK (role IN ('representative', 'manager', 'director')),
  parent_id uuid REFERENCES public.representatives(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage representatives"
  ON public.representatives FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- Users can view their own record
CREATE POLICY "Users can view own representative record"
  ON public.representatives FOR SELECT
  USING (user_id = auth.uid());
