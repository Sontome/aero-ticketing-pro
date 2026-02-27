
-- Bảng kakanoti: lưu PNR và phone khách
CREATE TABLE public.kakanoti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE,
  name text NOT NULL,
  pnr text NOT NULL CHECK (pnr ~ '^[A-Za-z0-9]{6}$'),
  timecreat timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kakanoti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all kakanoti"
  ON public.kakanoti FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert kakanoti"
  ON public.kakanoti FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update kakanoti"
  ON public.kakanoti FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete kakanoti"
  ON public.kakanoti FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Bảng sent_phone: lưu phone đã gửi Kakao
CREATE TABLE public.sent_phone (
  phone text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sent_phone ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sent_phone"
  ON public.sent_phone FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sent_phone"
  ON public.sent_phone FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sent_phone"
  ON public.sent_phone FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
