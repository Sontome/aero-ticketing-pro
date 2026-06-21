GRANT SELECT, INSERT, UPDATE, DELETE ON public.domain_config TO authenticated;
GRANT ALL ON public.domain_config TO service_role;

CREATE POLICY "Admins can view domain_config"
  ON public.domain_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert domain_config"
  ON public.domain_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update domain_config"
  ON public.domain_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete domain_config"
  ON public.domain_config FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));