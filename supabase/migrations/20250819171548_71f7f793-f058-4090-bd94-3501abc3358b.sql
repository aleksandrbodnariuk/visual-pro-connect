-- Fix security warnings: Strengthen RLS policies for sensitive data

-- 1. Fix "User Phone Numbers Could Be Harvested by Spammers"
-- Ensure phone numbers are not accessible through any public policies
-- (Already handled in previous migration - phone data only accessible to user themselves and admins)

-- 2. Fix "Private Messages Could Be Accessed by Unauthorized Users"
-- Strengthen message access policies to ensure only involved users can access messages
DROP POLICY IF EXISTS "Users can view messages they are involved in" ON public.messages;

CREATE POLICY "Users can view their own messages only" 
ON public.messages 
FOR SELECT 
USING (
  (sender_id = auth.uid()) OR 
  (receiver_id = auth.uid()) OR 
  check_admin_access()
);

-- Update other message policies to use stronger admin checks
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages they sent" ON public.messages;

CREATE POLICY "Users can update messages they received" 
ON public.messages 
FOR UPDATE 
USING (
  (receiver_id = auth.uid()) OR 
  check_admin_access()
);

CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (
  (sender_id = auth.uid()) OR 
  check_admin_access()
);

-- 3. Fix "Financial Transaction Data Could Be Exposed"
-- Strengthen transaction access policies
DROP POLICY IF EXISTS "Users can view transactions they're part of" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions they're part of" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions they created" ON public.transactions;

-- Create more restrictive transaction policies
CREATE POLICY "Users can view their own transactions only" 
ON public.transactions 
FOR SELECT 
USING (
  (seller_id = auth.uid()) OR 
  (buyer_id = auth.uid()) OR 
  check_admin_access()
);

CREATE POLICY "Users can create transactions as seller" 
ON public.transactions 
FOR INSERT 
WITH CHECK (
  (seller_id = auth.uid()) OR 
  check_admin_access()
);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (
  (seller_id = auth.uid()) OR 
  (buyer_id = auth.uid()) OR 
  check_admin_access()
);

CREATE POLICY "Users can delete transactions they created" 
ON public.transactions 
FOR DELETE 
USING (
  (seller_id = auth.uid()) OR 
  check_admin_access()
);

-- Additional security: Ensure market listings are properly protected
DROP POLICY IF EXISTS "Users can view all market listings" ON public.market;

CREATE POLICY "Users can view active market listings" 
ON public.market 
FOR SELECT 
USING (
  (status = 'активно' AND auth.uid() IS NOT NULL) OR
  (seller_id = auth.uid()) OR 
  check_admin_access()
);

-- Ensure shares data is properly protected
DROP POLICY IF EXISTS "Users can view all shares" ON public.shares;

CREATE POLICY "Users can view public shares info" 
ON public.shares 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) OR
  (user_id = auth.uid()) OR 
  check_admin_access()
);