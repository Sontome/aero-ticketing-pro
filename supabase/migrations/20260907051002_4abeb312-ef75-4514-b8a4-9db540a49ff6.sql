ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perm_check_premia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_ow_premia numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_rt_premia numeric NOT NULL DEFAULT 0;