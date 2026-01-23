-- Create reprice table for managing PNR repricing
CREATE TABLE public.reprice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr text NOT NULL,
  type text NOT NULL DEFAULT 'VFR',
  status text NOT NULL DEFAULT 'HOLD',
  old_price numeric,
  new_price numeric,
  last_checked_at timestamp with time zone,
  auto_reprice boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reprice ENABLE ROW LEVEL SECURITY;

-- Only admins can view reprice records
CREATE POLICY "Admins can view all reprice records"
ON public.reprice
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert reprice records
CREATE POLICY "Admins can insert reprice records"
ON public.reprice
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update reprice records
CREATE POLICY "Admins can update reprice records"
ON public.reprice
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete reprice records
CREATE POLICY "Admins can delete reprice records"
ON public.reprice
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_reprice_updated_at
BEFORE UPDATE ON public.reprice
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();