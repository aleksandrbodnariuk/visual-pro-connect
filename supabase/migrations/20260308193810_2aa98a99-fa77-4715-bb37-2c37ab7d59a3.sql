
-- 1. Add missing columns to market table
ALTER TABLE public.market 
  ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Add missing columns to transactions table  
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS price_per_share numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 3. Create atomic RPC for approving a transaction
CREATE OR REPLACE FUNCTION public.approve_share_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  seller_shares integer;
  buyer_shares_record RECORD;
BEGIN
  -- Only admin can call this
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Lock the transaction row
  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  
  IF tx IS NULL THEN
    RAISE EXCEPTION 'Транзакцію не знайдено' USING ERRCODE = 'no_data_found';
  END IF;
  
  IF tx.status != 'pending' THEN
    RAISE EXCEPTION 'Транзакцію вже змінено іншим користувачем' USING ERRCODE = 'check_violation';
  END IF;

  -- Check seller still has enough shares
  SELECT quantity INTO seller_shares FROM public.shares WHERE user_id = tx.seller_id FOR UPDATE;
  
  IF seller_shares IS NULL OR seller_shares < tx.quantity THEN
    RAISE EXCEPTION 'Недостатньо акцій у продавця' USING ERRCODE = 'check_violation';
  END IF;

  -- Deduct from seller
  UPDATE public.shares SET quantity = quantity - tx.quantity WHERE user_id = tx.seller_id;

  -- Add to buyer (upsert)
  INSERT INTO public.shares (user_id, quantity)
  VALUES (tx.buyer_id, tx.quantity)
  ON CONFLICT (user_id) DO UPDATE SET quantity = shares.quantity + EXCLUDED.quantity;

  -- Mark transaction as completed
  UPDATE public.transactions 
  SET status = 'completed', approved_by_admin = true, updated_at = now()
  WHERE id = _transaction_id;

  -- Mark the market listing as sold
  IF tx.share_id IS NOT NULL THEN
    UPDATE public.market SET status = 'sold', updated_at = now() WHERE id = tx.share_id;
  END IF;
  
  -- If buyer is not yet a shareholder, mark them
  UPDATE public.users SET is_shareholder = true WHERE id = tx.buyer_id AND is_shareholder = false;
  
  -- Add shareholder role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (tx.buyer_id, 'shareholder'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- 4. Create RPC for rejecting a transaction
CREATE OR REPLACE FUNCTION public.reject_share_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  
  IF tx IS NULL THEN
    RAISE EXCEPTION 'Транзакцію не знайдено' USING ERRCODE = 'no_data_found';
  END IF;
  
  IF tx.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Транзакцію вже змінено' USING ERRCODE = 'check_violation';
  END IF;

  -- Reject transaction
  UPDATE public.transactions SET status = 'rejected', updated_at = now() WHERE id = _transaction_id;

  -- Re-activate the listing
  IF tx.share_id IS NOT NULL THEN
    UPDATE public.market SET status = 'active', buyer_id = NULL, updated_at = now() WHERE id = tx.share_id;
  END IF;
END;
$$;

-- 5. Create RPC for getting issued shares count
CREATE OR REPLACE FUNCTION public.get_issued_shares_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity), 0)::integer FROM public.shares;
$$;

-- 6. Update existing market RLS policies for better access
-- Drop old policies that may conflict
DROP POLICY IF EXISTS "Users can manage their own market listings" ON public.market;
DROP POLICY IF EXISTS "Users can view active market listings" ON public.market;

-- Shareholders can view active listings
CREATE POLICY "Shareholders can view active listings" ON public.market
  FOR SELECT USING (
    (status = 'active' AND auth.uid() IS NOT NULL)
    OR seller_id = auth.uid()
    OR public.is_user_admin(auth.uid())
  );

-- Shareholders can create their own listings
CREATE POLICY "Shareholders can create listings" ON public.market
  FOR INSERT WITH CHECK (
    seller_id = auth.uid() AND public.has_role(auth.uid(), 'shareholder'::app_role)
  );

-- Shareholders can update own listings, admins can update any
CREATE POLICY "Manage own or admin listings" ON public.market
  FOR UPDATE USING (
    seller_id = auth.uid() OR public.is_user_admin(auth.uid())
  );

-- Admins can delete listings
CREATE POLICY "Admins can delete listings" ON public.market
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- 7. Update transactions RLS
DROP POLICY IF EXISTS "Users can create transactions as seller" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions they created" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions only" ON public.transactions;

-- Shareholders can view their own transactions, admins see all
CREATE POLICY "View own or admin transactions" ON public.transactions
  FOR SELECT USING (
    seller_id = auth.uid() OR buyer_id = auth.uid() OR public.is_user_admin(auth.uid())
  );

-- Shareholders can create transactions as buyer
CREATE POLICY "Shareholders can create buy transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    buyer_id = auth.uid() AND public.has_role(auth.uid(), 'shareholder'::app_role)
  );

-- Only admin updates via RPC, but allow policy for RPC security definer
CREATE POLICY "Admin can update transactions" ON public.transactions
  FOR UPDATE USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admin can delete transactions" ON public.transactions
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- 8. Normalize existing market data statuses
UPDATE public.market SET status = 'active' WHERE status = 'активно';
