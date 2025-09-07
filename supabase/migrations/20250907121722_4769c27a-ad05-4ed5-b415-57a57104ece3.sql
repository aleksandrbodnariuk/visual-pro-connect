-- Fix potential indirect user data exposure through shares table
-- Update shares table RLS policy to be more restrictive

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view public shares info" ON public.shares;

-- Create more restrictive policies
CREATE POLICY "Users can view their own shares" 
ON public.shares 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all shares" 
ON public.shares 
FOR SELECT 
USING (check_admin_access());

-- Ensure users can only manage their own shares
DROP POLICY IF EXISTS "Users can manage their own shares" ON public.shares;

CREATE POLICY "Users can insert their own shares" 
ON public.shares 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shares" 
ON public.shares 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own shares" 
ON public.shares 
FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all shares" 
ON public.shares 
FOR ALL 
USING (check_admin_access());