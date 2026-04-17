CREATE POLICY "Admins can delete audit log"
ON public.financial_audit_log
FOR DELETE
TO public
USING (is_user_admin(auth.uid()));