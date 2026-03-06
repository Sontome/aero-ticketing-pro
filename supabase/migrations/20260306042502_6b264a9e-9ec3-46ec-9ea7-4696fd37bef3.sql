
CREATE TABLE public.set_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.set_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit" ON public.set_rate_limit FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update rate limit" ON public.set_rate_limit FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert rate limit" ON public.set_rate_limit FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.set_rate_limit (minutes) VALUES (3);
