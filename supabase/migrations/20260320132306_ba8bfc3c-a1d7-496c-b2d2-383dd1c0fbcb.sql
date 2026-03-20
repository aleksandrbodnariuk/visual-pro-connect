
CREATE TABLE public.representative_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.specialist_orders(id) ON DELETE RESTRICT,
  representative_id UUID NOT NULL REFERENCES public.representatives(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL DEFAULT 0,
  percent NUMERIC NOT NULL DEFAULT 0,
  role_snapshot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Індекси
CREATE INDEX idx_rep_earnings_order ON public.representative_earnings(order_id);
CREATE INDEX idx_rep_earnings_rep ON public.representative_earnings(representative_id);

-- RLS
ALTER TABLE public.representative_earnings ENABLE ROW LEVEL SECURITY;

-- Адміни мають повний доступ
CREATE POLICY "Admins full access representative_earnings"
  ON public.representative_earnings
  FOR ALL
  TO public
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

-- Представники бачать свої записи
CREATE POLICY "Representatives can view own earnings"
  ON public.representative_earnings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.representatives r
      WHERE r.id = representative_earnings.representative_id
        AND r.user_id = auth.uid()
    )
  );

-- Заборона UPDATE та DELETE для не-адмінів (immutable records)
-- Вставку дозволяємо лише адмінам (через існуючу ALL policy)
