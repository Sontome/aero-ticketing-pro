
-- 1. New columns on held_tickets
ALTER TABLE public.held_tickets
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS number_person integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS namelist text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ticket_status text NOT NULL DEFAULT 'holding';

-- 2. Create segments table
CREATE TABLE IF NOT EXISTS public.held_ticket_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  held_ticket_id uuid NOT NULL REFERENCES public.held_tickets(id) ON DELETE CASCADE,
  segment_order integer NOT NULL,
  departure_airport text NOT NULL,
  arrival_airport text NOT NULL,
  departure_date date NOT NULL,
  departure_time text NOT NULL,
  trip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_held_tickets_user_id ON public.held_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_held_tickets_pnr ON public.held_tickets(pnr);
CREATE INDEX IF NOT EXISTS idx_held_tickets_ticket_status ON public.held_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS idx_segments_ticket_id ON public.held_ticket_segments(held_ticket_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.held_ticket_segments TO authenticated;
GRANT ALL ON public.held_ticket_segments TO service_role;
ALTER TABLE public.held_ticket_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own segments"
  ON public.held_ticket_segments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.held_tickets t WHERE t.id = held_ticket_id AND t.user_id = auth.uid()));

CREATE POLICY "Users insert their own segments"
  ON public.held_ticket_segments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.held_tickets t WHERE t.id = held_ticket_id AND t.user_id = auth.uid()));

CREATE POLICY "Users update their own segments"
  ON public.held_ticket_segments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.held_tickets t WHERE t.id = held_ticket_id AND t.user_id = auth.uid()));

CREATE POLICY "Users delete their own segments"
  ON public.held_ticket_segments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.held_tickets t WHERE t.id = held_ticket_id AND t.user_id = auth.uid()));

-- 3. Backfill existing held_tickets
UPDATE public.held_tickets
SET
  ticket_status = COALESCE(status, 'holding'),
  payment_status = (status = 'issued'),
  airline = COALESCE(
    flight_details->>'airline',
    CASE
      WHEN flight_details ? 'bookingKey' THEN 'VJ'
      ELSE 'OTHER'
    END
  ),
  namelist = COALESCE((
    SELECT array_agg(
      trim(
        COALESCE(p->>'lastName', p->>'Họ', '') || ' ' || COALESCE(p->>'firstName', p->>'Tên', '')
      )
    )
    FROM jsonb_array_elements(COALESCE(flight_details->'passengers', '[]'::jsonb)) AS p
  ), '{}')
WHERE airline IS NULL OR airline = '';

UPDATE public.held_tickets
SET number_person = GREATEST(COALESCE(array_length(namelist, 1), 1), 1);

-- 4. Backfill segments for VNA tickets (other airlines lack data)
INSERT INTO public.held_ticket_segments
  (held_ticket_id, segment_order, departure_airport, arrival_airport, departure_date, departure_time, trip)
SELECT
  t.id,
  1,
  flight_details->>'departureAirport',
  flight_details->>'arrivalAirport',
  -- parse DD/MM/YYYY
  to_date(flight_details->>'departureDate', 'DD/MM/YYYY'),
  COALESCE(flight_details->>'departureTime', '00:00'),
  (flight_details->>'departureAirport') || '-' || (flight_details->>'arrivalAirport')
FROM public.held_tickets t
WHERE flight_details ? 'departureAirport'
  AND flight_details ? 'arrivalAirport'
  AND flight_details ? 'departureDate'
  AND NOT EXISTS (SELECT 1 FROM public.held_ticket_segments s WHERE s.held_ticket_id = t.id)
  AND (flight_details->>'departureDate') ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$';

INSERT INTO public.held_ticket_segments
  (held_ticket_id, segment_order, departure_airport, arrival_airport, departure_date, departure_time, trip)
SELECT
  t.id,
  2,
  flight_details->>'arrivalAirport',
  flight_details->>'departureAirport',
  to_date(flight_details->>'arrivalDate', 'DD/MM/YYYY'),
  COALESCE(flight_details->>'arrivalTime', '00:00'),
  (flight_details->>'arrivalAirport') || '-' || (flight_details->>'departureAirport')
FROM public.held_tickets t
WHERE flight_details->>'tripType' = 'RT'
  AND flight_details ? 'arrivalDate'
  AND (flight_details->>'arrivalDate') ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
  AND NOT EXISTS (SELECT 1 FROM public.held_ticket_segments s WHERE s.held_ticket_id = t.id AND s.segment_order = 2);

-- 5. Make airline NOT NULL after backfill
UPDATE public.held_tickets SET airline = 'OTHER' WHERE airline IS NULL;
ALTER TABLE public.held_tickets ALTER COLUMN airline SET NOT NULL;

-- 6. Drop legacy columns
ALTER TABLE public.held_tickets DROP COLUMN IF EXISTS flight_details;
ALTER TABLE public.held_tickets DROP COLUMN IF EXISTS status;
