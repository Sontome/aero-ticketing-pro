GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_email TO authenticated;
GRANT ALL ON public.inbound_email TO service_role;
ALTER TABLE public.inbound_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view inbound_email" ON public.inbound_email FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update inbound_email" ON public.inbound_email FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert inbound_email" ON public.inbound_email FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete inbound_email" ON public.inbound_email FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));