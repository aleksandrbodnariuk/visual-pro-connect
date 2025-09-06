-- Fix security vulnerability: Restrict bmbg table access to admin only
-- The bmbg table contains sensitive phone numbers that should not be accessible to all authenticated users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view bmbg entries" ON public.bmbg;

-- Create a new restrictive policy that only allows admins to view entries
CREATE POLICY "Only admins can view bmbg entries" 
ON public.bmbg 
FOR SELECT 
USING (is_admin(auth.uid()));

-- The existing "Only admins can manage bmbg entries" policy for ALL operations remains unchanged