
CREATE TABLE public.ticket_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ticket_campaigns TO authenticated;
GRANT ALL ON public.ticket_campaigns TO service_role;
ALTER TABLE public.ticket_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view campaigns" ON public.ticket_campaigns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert campaigns" ON public.ticket_campaigns
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update campaigns" ON public.ticket_campaigns
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete campaigns" ON public.ticket_campaigns
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.ticket_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ticket_campaigns(id) ON DELETE CASCADE,
  airline TEXT,
  route TEXT,
  departure_time TEXT,
  arrival_time TEXT,
  segment_position INTEGER,
  leg_scope TEXT,
  match_scope TEXT,
  booking_class TEXT,
  require_other_leg_direct BOOLEAN NOT NULL DEFAULT false,
  action TEXT NOT NULL,
  value TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ticket_rules TO authenticated;
GRANT ALL ON public.ticket_rules TO service_role;
ALTER TABLE public.ticket_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view rules" ON public.ticket_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert rules" ON public.ticket_rules
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update rules" ON public.ticket_rules
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete rules" ON public.ticket_rules
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ticket_rules_campaign ON public.ticket_rules(campaign_id);
CREATE INDEX idx_ticket_rules_enabled ON public.ticket_rules(enabled);

CREATE TRIGGER update_ticket_campaigns_updated_at BEFORE UPDATE ON public.ticket_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_ticket_rules_updated_at BEFORE UPDATE ON public.ticket_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
