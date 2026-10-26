import { describe, expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';
import { canManagePromos, promoStatus, promoPayload, utcToVietnamInput, vietnamInputToUtc, escapePromoSearch, promoError } from '../src/lib/promocodes';
import { fetchPromos, savePromo, togglePromo, deletePromo } from '../src/services/promocodes';
import type { Database } from '../src/integrations/supabase/types';
const form = { airline: 'SUN', code: 'AbC123', enabled: true, start: '', end: '', note: '' };
const now = Date.parse('2026-10-26T10:09:00Z');
describe('Promocode rules', () => {
  test('only admin may manage', () => { expect(canManagePromos('admin')).toBe(true); for (const role of ['user', 'manager', undefined]) expect(canManagePromos(role)).toBe(false); });
  test('disabled precedes expired and upcoming', () => expect(promoStatus({ enabled: false, valid_until: new Date(now).toISOString(), valid_from: new Date(now + 1).toISOString() }, now)).toBe('disabled'));
  test('end is exclusive, even if start is future', () => expect(promoStatus({ enabled: true, valid_until: new Date(now).toISOString(), valid_from: new Date(now + 1).toISOString() }, now)).toBe('expired'));
  test('future start is upcoming', () => expect(promoStatus({ enabled: true, valid_until: null, valid_from: new Date(now + 1).toISOString() }, now)).toBe('upcoming'));
  test('start is inclusive and null limits active', () => { expect(promoStatus({ enabled: true, valid_from: new Date(now).toISOString(), valid_until: null }, now)).toBe('active'); expect(promoStatus({ enabled: true, valid_from: null, valid_until: null }, now)).toBe('active'); });
  test('preserves code case and never writes updated_at or priority', () => { const p = promoPayload(form); expect(p.code).toBe('AbC123'); expect(p).not.toHaveProperty('updated_at'); expect(p).not.toHaveProperty('priority'); expect(p.valid_from).toBeNull(); });
  test('rejects whitespace, hidden and control characters without normalizing', () => { for (const c of [' ', '\t', '\n', '\u200b', '\u2060', '\ufeff', '\x00']) expect(() => promoPayload({ ...form, code: `A${c}B` })).toThrow(); });
  test('requires airline and code', () => { expect(() => promoPayload({ ...form, airline: '' })).toThrow(); expect(() => promoPayload({ ...form, code: '' })).toThrow(); });
  test('Vietnam conversion independent of device timezone', () => { const original = process.env.TZ; try { for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo']) { process.env.TZ = tz; expect(vietnamInputToUtc('2026-11-01T00:00')).toBe('2026-10-31T17:00:00.000Z'); expect(utcToVietnamInput('2026-10-31T17:00:00.000Z')).toBe('2026-11-01T00:00:00'); } } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; } });
  test('invalid dates and non-increasing windows rejected, limits can be cleared', () => { expect(() => vietnamInputToUtc('2026-02-30T00:00')).toThrow(); expect(() => promoPayload({ ...form, start: '2026-11-01T00:00', end: '2026-11-01T00:00' })).toThrow(); expect(promoPayload({ ...form, end: '' }).valid_until).toBeNull(); });
  test('literal wildcard search and constraint error', () => { expect(escapePromoSearch('A%_\\')).toBe('%A\\%\\_\\\\%'); expect(promoError({ code: '23505' })).toBe('Mã này đã tồn tại cho hãng đã chọn.'); });
});
function transport() {
  const requests: { url: URL; method: string; body: Record<string, unknown> | null; headers: Headers }[] = [];
  const client = createClient<Database>('https://example.supabase.co', 'mock-anon-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (async (url, options) => {
    requests.push({ url: new URL(String(url)), method: options?.method ?? 'GET', body: options?.body ? JSON.parse(String(options.body)) : null, headers: new Headers(options?.headers) });
    return new Response(JSON.stringify(options?.method === 'GET' ? [] : { id: 'id1' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/41' } });
  }) as typeof fetch } });
  return { client, requests };
}
describe('Supabase requests with mocked transport only', () => {
  test('filters and exact count precede server pagination and stable ordering', async () => {
    const { client, requests } = transport();
    const result = await fetchPromos({ airline: 'SUN', status: 'active', search: 'x),enabled.eq.false', page: 2 }, undefined, client, '2026-10-26T10:09:00.000Z');
    const r = requests[0];
    expect(result.total).toBe(41); expect(r.url.searchParams.get('airline')).toBe('eq.SUN'); expect(r.url.searchParams.get('code')).toBe('ilike.%x),enabled.eq.false%');
    expect(r.url.searchParams.getAll('or')).toEqual(['(valid_until.is.null,valid_until.gt.2026-10-26T10:09:00.000Z)', '(valid_from.is.null,valid_from.lte.2026-10-26T10:09:00.000Z)']);
    expect(r.url.searchParams.get('offset')).toBe('20'); expect(r.url.searchParams.get('limit')).toBe('20'); expect(r.url.searchParams.get('order')).toBe('airline.asc,code.asc,id.asc'); expect(r.headers.get('prefer')).toContain('count=exact');
  });
  test('all status query rules match precedence using same now', async () => {
    const { client, requests } = transport(); const time = '2026-10-26T10:09:00.000Z';
    for (const status of ['disabled', 'expired', 'upcoming'] as const) await fetchPromos({ airline: 'all', status, search: '', page: 1 }, undefined, client, time);
    expect(requests[0].url.searchParams.get('enabled')).toBe('eq.false'); expect(requests[1].url.searchParams.get('enabled')).toBe('eq.true'); expect(requests[1].url.searchParams.get('valid_until')).toBe(`lte.${time}`); expect(requests[2].url.searchParams.get('valid_from')).toBe(`gt.${time}`); expect(requests[2].url.searchParams.getAll('or')).toEqual([`(valid_until.is.null,valid_until.gt.${time})`]);
  });
  test('save preserves code and UTC; toggle changes only enabled; delete is id-scoped', async () => {
    const { client, requests } = transport();
    await savePromo('id1', promoPayload({ ...form, end: '2026-11-01T00:00' }), client);
    await togglePromo('id1', true, client); await deletePromo('id1', client);
    expect(requests[0].body?.valid_until).toBe('2026-10-31T17:00:00.000Z'); expect(requests[0].body?.code).toBe('AbC123'); expect(requests[0].body).not.toHaveProperty('updated_at'); expect(requests[1].body).toEqual({ enabled: true }); expect(requests[2].method).toBe('DELETE'); for (const r of requests) expect(r.url.searchParams.get('id')).toBe('eq.id1');
  });
});