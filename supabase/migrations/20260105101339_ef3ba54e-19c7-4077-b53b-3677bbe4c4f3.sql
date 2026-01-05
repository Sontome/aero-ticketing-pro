-- Add perm_reprice column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN perm_reprice boolean DEFAULT false;