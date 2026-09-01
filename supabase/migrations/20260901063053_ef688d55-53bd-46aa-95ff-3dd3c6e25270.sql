GRANT SELECT, UPDATE ON public.kakao_apiapp_config TO authenticated;
GRANT ALL ON public.kakao_apiapp_config TO service_role;

CREATE POLICY "Admins can read kakao_apiapp_config"
ON public.kakao_apiapp_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update kakao_apiapp_config"
ON public.kakao_apiapp_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));