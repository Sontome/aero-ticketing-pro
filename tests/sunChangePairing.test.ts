import { describe, expect, test } from 'bun:test';
import { buildChangePayload, pairSunSegments, toggleSunSelection } from '../src/lib/sunChangeTicket';

const o1 = { segment_id: 1, flight_status: 'NN', nested: { original: true } };
const o2 = { segment_id: 2 };
const o3 = { segment_id: 3 };
const n1 = { segment_id: 11, flight_status: 'NN', fare_basis: 'Y' };
const n2 = { segment_id: 12 };
const n3 = { segment_id: 13 };
const old = { out: [o1, o2], back: [o3] };
const next = { out: [n1, n2], back: [n3] };

describe('SUN selection and direction pairing', () => {
  test('select/deselect; third selection is ignored', () => {
    const one = toggleSunSelection([], o1);
    const two = toggleSunSelection(one, o2);
    expect(two).toEqual([o1, o2]);
    expect(toggleSunSelection(two, o3)).toBe(two);
    expect(toggleSunSelection(two, o1)).toEqual([o2]);
  });
  test('one pair sends two arrays of length one, original fields unchanged', () => {
    const pair = pairSunSegments(old, next, [o2], [n1]);
    if (pair.ok === false) throw new Error('Expected one pair');
    const payload = buildChangePayload('ABCDEF', pair.old, pair.next);
    expect(payload.old_itinerary).toHaveLength(1);
    expect(payload.new_itinerary).toHaveLength(1);
    expect(payload.old_itinerary[0]).toBe(o2);
    expect(payload.new_itinerary[0]).toBe(n1);
    expect(payload.new_itinerary[0].flight_status).toBe('NN');
  });
  test('round trip: outbound before return regardless of click order', () => {
    const pair = pairSunSegments(old, next, [o3, o1], [n3, n1]);
    if (pair.ok === false) throw new Error('Expected two pairs');
    const payload = buildChangePayload('ABCDEF', pair.old, pair.next);
    expect(payload.old_itinerary).toHaveLength(2);
    expect(payload.new_itinerary).toHaveLength(2);
    expect(payload.old_itinerary[0]).toBe(o1);
    expect(payload.old_itinerary[1]).toBe(o3);
    expect(payload.new_itinerary[0]).toBe(n1);
    expect(payload.new_itinerary[1]).toBe(n3);
    expect(payload.old_itinerary[0].nested).toBe(o1.nested);
  });
  test('connecting segments retain source order, no whole-direction aggregation', () => {
    const pair = pairSunSegments(old, next, [o2, o1], [n2, n1]);
    if (pair.ok === false) throw new Error('Expected two connecting pairs');
    expect(pair.old).toEqual([o1, o2]);
    expect(pair.next).toEqual([n1, n2]);
    expect(pair.old).not.toContain(o3);
  });
  test('two outbound versus outbound + return is invalid', () => {
    expect(pairSunSegments(old, next, [o1, o2], [n1, n3])).toEqual({ ok: false, reason: 'direction' });
    expect(pairSunSegments(old, next, [o1, o3], [n1, n2])).toEqual({ ok: false, reason: 'direction' });
  });
  test('counts must match and selections must be unique source objects', () => {
    expect(pairSunSegments(old, next, [o1], [n1, n2]).ok).toBe(false);
    expect(pairSunSegments(old, next, [o1, o1], [n1, n2]).ok).toBe(false);
    expect(pairSunSegments(old, next, [{ ...o1 }], [n1]).ok).toBe(false);
    expect(pairSunSegments(old, next, [], []).ok).toBe(false);
    expect(pairSunSegments(old, next, [o1, o2, o3], [n1, n2, n3]).ok).toBe(false);
    expect(() => buildChangePayload('ABCDEF', [o1], [n1, n2])).toThrow();
  });
});