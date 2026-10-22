import { describe, expect, test } from 'bun:test';
import {
  adjustedTotal, buildChangePayload, newSegmentsFromTrip, parseChangeResponse, parseCheckResponse,
  parseSunDateTime, validateFeeEdit, segView,
  pairSunSegments, toggleSunSelection,
} from '../src/lib/sunChangeTicket';

const oldSeg = { trip_id: 1, segment_id: 11, departure: 'ICN', arrival: 'PQC', flight_status: 'NN', booking_class: 'Y', fare_basis: 'YOW', nested: { a: 1 } };
const newSeg = { trip_id: 9, segment_id: 99, departure: 'ICN', arrival: 'PQC', flight_status: 'NN', booking_class: 'V', fare_basis: 'VOW', flight_date: '2026-12-19 00:15:00' };

describe('dates', () => {
  test('ISO and DMY and broken', () => {
    expect(parseSunDateTime('2026-12-19 00:15:00')).toEqual({ date: '2026-12-19', time: '00:15' });
    expect(parseSunDateTime('19/12/2026')).toEqual({ date: '2026-12-19', time: '' });
    expect(parseSunDateTime('19 00:15:00/12/2026')).toEqual({ date: '2026-12-19', time: '00:15' });
    expect(parseSunDateTime('garbage')).toBeNull();
  });
  test('arrival date differs', () => {
    const v = segView({ departure_info: { datetime: '2026-12-19 23:00:00' }, arrival_info: { datetime: '2026-12-20 03:35:00' } });
    expect(v.arrDate).toBe('2026-12-20');
  });
});

describe('payload', () => {
  test('arrays length 1, objects untouched incl NN', () => {
    const p = buildChangePayload('ABCDEF', [oldSeg], [newSeg]);
    expect(p.old_itinerary).toHaveLength(1);
    expect(p.new_itinerary).toHaveLength(1);
    expect(p.old_itinerary[0]).toBe(oldSeg);
    expect(p.new_itinerary[0]).toBe(newSeg);
    expect(JSON.parse(JSON.stringify(p)).new_itinerary[0]).toEqual(newSeg);
    expect(p.old_itinerary[0].flight_status).toBe('NN');
  });
  test('RT / connecting: each segment separate', () => {
    const g = newSegmentsFromTrip({ chiều_đi: { list_itinerary: [newSeg, oldSeg] }, chiều_về: { list_itinerary: [oldSeg] } });
    expect(g.out).toHaveLength(2);
    expect(g.back).toHaveLength(1);
  });
});

describe('check response', () => {
  test('requires success true + segments', () => {
    expect(parseCheckResponse(true, { success: false, message: 'x' }, 'A').ok).toBe(false);
    expect(parseCheckResponse(true, { success: true, data: { chieudi: [], chieuve: [] } }, 'A').ok).toBe(false);
    expect(parseCheckResponse(false, { success: true, data: { chieudi: [oldSeg] } }, 'A').ok).toBe(false);
    expect(parseCheckResponse(true, null, 'A').ok).toBe(false);
    expect(parseCheckResponse(true, { success: true, data: { chieudi: [oldSeg] } }, 'A').ok).toBe(true);
  });
});

describe('change response + fees', () => {
  const r = parseChangeResponse(true, { success: true, data: { pnr_number: 'ABCDEF', currency: 'KRW', chenhlech_giagoc: 0, chenhlech_thuephi: -5000, phi_doi_ve: 0, tong_giathaydoi: 12345, list_itinerary: [newSeg, oldSeg] } }, 'ABCDEF');
  test('keeps 0, negative, API total', () => {
    if (!r.ok) throw new Error('fail');
    expect(r.data.chenhlech_thuephi).toBe(-5000);
    expect(r.data.phi_doi_ve).toBe(0);
    expect(adjustedTotal(r.data, {})).toBe(12345);
    expect(r.data.list_itinerary).toHaveLength(2);
  });
  test('edits shift total by delta', () => {
    if (!r.ok) throw new Error('fail');
    expect(adjustedTotal(r.data, { phi_doi_ve: 10000, chenhlech_thuephi: 0 })).toBe(12345 + 10000 + 5000);
  });
  test('edit min bound', () => {
    expect(validateFeeEdit('-6000', -5000).ok).toBe(false);
    expect(validateFeeEdit('-5000', -5000).ok).toBe(true);
    expect(validateFeeEdit('abc', 0).ok).toBe(false);
    expect(validateFeeEdit('10,000', 0)).toEqual({ ok: true, value: 10000 });
  });
  test('success false rejected', () => {
    expect(parseChangeResponse(true, { success: false }, 'A').ok).toBe(false);
    expect(parseChangeResponse(true, {}, 'A').ok).toBe(false);
  });
});
