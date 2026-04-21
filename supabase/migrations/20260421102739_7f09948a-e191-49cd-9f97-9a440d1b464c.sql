-- Create user_certificates table
CREATE TABLE public.user_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percent')),
  discount_value NUMERIC NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  note TEXT,
  issued_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation trigger: percent must be <= 100
CREATE OR REPLACE FUNCTION public.validate_certificate_discount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.discount_type = 'percent' AND NEW.discount_value > 100 THEN
    RAISE EXCEPTION 'Відсоток знижки не може перевищувати 100';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_certificate
BEFORE INSERT OR UPDATE ON public.user_certificates
FOR EACH ROW EXECUTE FUNCTION public.validate_certificate_discount();

-- Index for fast lookups
CREATE INDEX idx_user_certificates_user_id ON public.user_certificates(user_id);
CREATE INDEX idx_user_certificates_active ON public.user_certificates(user_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see certificates (public badge)
CREATE POLICY "Authenticated users can view certificates"
ON public.user_certificates
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage certificates
CREATE POLICY "Admins can insert certificates"
ON public.user_certificates
FOR INSERT
TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update certificates"
ON public.user_certificates
FOR UPDATE
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete certificates"
ON public.user_certificates
FOR DELETE
TO authenticated
USING (public.is_user_admin(auth.uid()));