import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { useSunChangeTicket, SUN_UNKNOWN_RESULT_MSG } from '../src/hooks/useSunChangeTicket';
import type { SunNewGroups } from '../src/lib/sunChangeTicket';

const o1 = { segment_id: 1, departure: 'ICN', arrival: 'HAN', flight_status: 'NN' };
const o2 = { segment_id: 2, departure: 'HAN', arrival: 'SGN' };
const o3 = { segment_id: 3, departure: 'HAN', arrival: 'ICN' };
const n1 = { segment_id: 11, departure: 'ICN', arrival: 'HAN', flight_status: 'NN' };
const n2 = { segment_id: 12, departure: 'HAN', arrival: 'SGN' };
const n3 = { segment_id: 13, departure: 'HAN', arrival: 'ICN' };
const result = { success: true, data: {
  pnr_number: 'ABCDEF', currency: 'KRW', chenhlech_giagoc: 0, chenhlech_thuephi: -5000,
  phi_doi_ve: 0, tong_giathaydoi: 12345, list_itinerary: [n1, n3], pax_pricing: [],
} };
const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
const checkData = (out = [o1, o2], back = [o3]) => ({ success: true, data: { chieudi: out, chieuve: back } });

let current: ReturnType<typeof useSunChangeTicket> | undefined;
let renderer: ReturnType<typeof create> | undefined;
const originalFetch = globalThis.fetch;
const h = () => { if (!current) throw new Error('Hook not mounted'); return current; };
function Harness({ groups }: { groups: SunNewGroups }) {
  current = useSunChangeTicket(groups);
  return null;
}
const mount = (groups: SunNewGroups = { out: [n1, n2], back: [n3] }) => {
  act(() => { renderer = create(<Harness groups={groups} />); });
};
const check = async () => {
  act(() => h().setPnr('ABCDEF'));
  await act(async () => { await h().runCheck(); });
};
const choose = (old: number[], next: number[]) => act(() => {
  const source = [...(h().checked?.chieudi ?? []), ...(h().checked?.chieuve ?? [])];
  old.forEach((i) => h().toggleOld(source[i]));
  const fresh = [n1, n2, n3];
  next.forEach((i) => h().toggleNew(fresh[i]));
});
beforeEach(() => { current = undefined; });
afterEach(() => {
  if (renderer) act(() => renderer?.unmount());
  renderer = undefined;
  globalThis.fetch = originalFetch;
});

describe('SUN hook with mocked transport (no real airline API)', () => {
  test('single-segment lists auto-select and send exactly one pair', async () => {
    const bodies: any[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      if (url.endsWith('/checkpnr')) return response(checkData([o1], []));
      bodies.push(JSON.parse(String(init.body)));
      return response(result);
    }) as typeof fetch;
    mount({ out: [n1], back: [] });
    await check();
    expect(h().oldSel).toHaveLength(1);
    expect(h().newSel).toEqual([n1]);
    expect(h().canConfirm).toBe(true);
    await act(async () => { await h().runChange(); });
    expect(bodies[0].old_itinerary).toEqual([o1]);
    expect(bodies[0].new_itinerary).toEqual([n1]);
    expect(h().result?.tong_giathaydoi).toBe(12345);
  });
  test('two pairs, click return first, rapid confirmation sends only one request', async () => {
    const bodies: any[] = [];
    let finish: ((r: Response) => void) | undefined;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      if (url.endsWith('/checkpnr')) return response(checkData());
      bodies.push(JSON.parse(String(init.body)));
      return new Promise<Response>((resolve) => { finish = resolve; });
    }) as typeof fetch;
    mount(); await check(); choose([2, 0], [2, 0]);
    expect(h().canConfirm).toBe(true);
    let pending: Promise<void> | undefined;
    act(() => { pending = h().runChange(); void h().runChange(); });
    expect(h().canConfirm).toBe(false);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].old_itinerary).toEqual([o1, o3]);
    expect(bodies[0].new_itinerary).toEqual([n1, n3]);
    await act(async () => { finish?.(response(result)); await pending; });
    expect(h().result?.list_itinerary).toEqual([n1, n3]);
    await act(async () => { await h().runChange(); });
    expect(bodies).toHaveLength(1);
  });
  test('mismatched directions lock confirmation and cannot send', async () => {
    let changes = 0;
    globalThis.fetch = (async (url: string) => {
      if (url.endsWith('/change-pnr')) changes++;
      return response(checkData());
    }) as typeof fetch;
    mount(); await check(); choose([0, 1], [0, 2]);
    expect(h().pairing).toEqual({ ok: false, reason: 'direction' });
    expect(h().canConfirm).toBe(false);
    await act(async () => { await h().runChange(); });
    expect(changes).toBe(0);
  });
  test('changing PNR clears both old and new selections', async () => {
    globalThis.fetch = (async () => response(checkData())) as typeof fetch;
    mount(); await check(); choose([0, 2], [0, 2]);
    expect(h().canConfirm).toBe(true);
    act(() => h().setPnr('ZYXWVU'));
    expect(h().oldSel).toEqual([]);
    expect(h().newSel).toEqual([]);
    expect(h().checked).toBeNull();
    expect(h().canConfirm).toBe(false);
  });
  test('reset ignores old response after reopening', async () => {
    let finish: ((r: Response) => void) | undefined;
    globalThis.fetch = (async () => new Promise<Response>((resolve) => { finish = resolve; })) as typeof fetch;
    mount(); act(() => h().setPnr('ABCDEF'));
    let pending: Promise<void> | undefined;
    act(() => { pending = h().runCheck(); });
    act(() => { h().reset(); h().setPnr('ZYXWVU'); });
    await act(async () => { finish?.(response(checkData())); await pending; });
    expect(h().pnr).toBe('ZYXWVU');
    expect(h().checked).toBeNull();
    expect(h().oldSel).toEqual([]);
    expect(h().newSel).toEqual([]);
  });
  test('unknown outcome clears selection and never retries automatically', async () => {
    let changes = 0;
    globalThis.fetch = (async (url: string) => {
      if (url.endsWith('/checkpnr')) return response(checkData());
      changes++;
      throw new Error('Mock timeout');
    }) as typeof fetch;
    mount(); await check(); choose([0], [0]);
    await act(async () => { await h().runChange(); });
    expect(h().error).toBe(SUN_UNKNOWN_RESULT_MSG);
    expect(h().oldSel).toEqual([]);
    expect(h().newSel).toEqual([]);
    await act(async () => { await h().runChange(); });
    expect(changes).toBe(1);
  });
});