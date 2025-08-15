-- Fix security vulnerability: Restrict access to bmbg table phone numbers
-- Currently anyone can view all bmbg entries, which exposes phone numbers

-- Drop the overly permissive policy that allows anyone to view all entries
DROP POLICY IF EXISTS "Users can view all bmbg entries" ON public.bmbg;

-- Create a more secure policy that only allows authenticated users to view entries
-- This prevents unauthorized access to phone numbers
CREATE POLICY "Authenticated users can view bmbg entries" 
ON public.bmbg 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Optional: If you want even more restrictive access, you could limit to shareholders only
-- CREATE POLICY "Shareholders can view bmbg entries" 
-- ON public.bmbg 
-- FOR SELECT 
-- USING (
--   auth.uid() IS NOT NULL AND 
--   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_shareholder = true)
-- );