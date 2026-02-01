-- Add new columns to profiles table for other airlines
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS perm_check_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price_ow_other numeric DEFAULT 10000,
ADD COLUMN IF NOT EXISTS price_rt_other numeric DEFAULT 10000,
ADD COLUMN IF NOT EXISTS list_other text[] DEFAULT '{}'::text[];