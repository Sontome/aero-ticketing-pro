# Promocode
- [x] Inspect existing Admin, routing, cache and database access.
- [x] Apply Admin-only grants and RLS to existing promo table.
- [x] Implement Dashboard card, list/filter/pagination and CRUD dialogs.
- [x] Run 14 promo mock tests and 21 SUN regression tests; verify policies and grants. Authenticated live CRUD cannot be tested with external unmanaged Supabase session.

# VNA multi-city holds
- [x] Reuse VNA booking form and connect multi-city hold action.
- [x] Build booking-v3 payload, retain all selected segments and delivery contacts.
- [x] Verify mock UI form-to-PNR flow and 42 regression/contract tests without creating a real PNR; external unmanaged Supabase prevents authenticated live verification.

# VNA V5
- [ ] Switch OW/RT/MD searches to V5 and preserve all direction segments.
- [ ] Use booking-v3 for selected OW/RT itineraries with delivery contacts and id_f2.
- [ ] Update segment display/copy and run mocked regression checks without real booking.