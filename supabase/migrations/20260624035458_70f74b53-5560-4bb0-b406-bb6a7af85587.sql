ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_check_sunpq boolean NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_ow_sunpq  numeric  NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_rt_sunpq  numeric  NULL DEFAULT 0;