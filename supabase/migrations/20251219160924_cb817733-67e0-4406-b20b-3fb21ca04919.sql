-- Fix RLS policy for notifications to allow users to create notifications for others
CREATE POLICY "Users can create notifications for others" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (true);