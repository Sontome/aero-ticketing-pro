import { describe, expect, test } from 'bun:test';
import { parseVnaV5, vnaWaitTime, type VnaSegment, type VnaItineraryV5 } from '../src/lib/vnaV5';
import { buildVnaBookingV3, vnaBookingFlight } from '../src/lib/vnaBookingV3';
import { fetchVNAFlightsV5 } from '../src/services/flightApi';
import { fetchVNAMultiCity } from '../src/services/vnaMultiCityApi';

const segment = (patch: Partial<VnaSegment> = {}): VnaSegment => ({
  hãng: 'VNA', id: '1', nơi_đi: 'ICN', nơi_đến: 'HAN', giờ_cất_cánh: '18:05', ngày_cất_cánh: '14/11/2026',
  giờ_hạ_cánh: '20:55', ngày_hạ_cánh: '14/11/2026', thời_gian_bay: '290', thời_gian_chờ: '00:00',
  số_hiệu_máy_bay: 'VN415', số_điểm_dừng: '0', điểm_dừng_1: '', điểm_dừng_2: '', loại_vé: 'M', ...patch,
});
const out = [segment(), segment({ nơi_đi: 'HAN', nơi_đến: 'VII', giờ_cất_cánh: '07:05', ngày_cất_cánh: '15/11/2026', giờ_hạ_cánh: '08:00', ngày_hạ_cánh: '15/11/2026', thời_gian_bay: '55', số_hiệu_máy_bay: 'VN1715' })];
const back = [segment({ nơi_đi: 'VII', nơi_đến: 'SGN', ngày_cất_cánh: '21/11/2026', ngày_hạ_cánh: '21/11/2026', số_hiệu_máy_bay: 'VN1269', loại_vé: 'N' }), segment({ nơi_đi: 'SGN', nơi_đến: 'ICN', ngày_cất_cánh: '22/11/2026', ngày_hạ_cánh: '22/11/2026', số_hiệu_máy_bay: 'VN402', loại_vé: 'N' })];
const itinerary = (outbound = out, inbound?: VnaSegment[]): VnaItineraryV5 => ({ chiều_đi: outbound, ...(inbound ? { chiều_về: inbound } : {}), thông_tin_chung: { giá_vé: '987600', số_ghế_còn: '2', hành_lý_vna: 'VFR', idx: '1' } });
const parse = (i: VnaItineraryV5) => parseVnaV5([i], 'VFR', s => s)[0];

describe('VNA V5 itinerary rules', () => {
  test('OW direct has one segment, no return and exact booking arrays', () => {
    const i = itinerary([segment()]); const f = parse(i);
    expect(f.return).toBeUndefined(); expect(f.departure.stops).toBe(0);
    const payload = buildVnaBookingV3(vnaBookingFlight(f), [{ Họ: 'TRAN', Tên: 'A', Giới_tính: 'nam', type: 'người_lớn' }], 'VFR', 'test@example.com', '+84901234567', 'f2');
    expect(payload.body.list_itinerary).toEqual(i); expect(payload.body.list_itinerary).not.toHaveProperty('chặng_1');
  });
  test('OW connection summarizes endpoints, overnight arrival and actual transfer wait', () => {
    const f = parse(itinerary()); expect(f.departure.airport).toBe('ICN'); expect(f.arrival.airport).toBe('VII');
    expect(f.arrival.date).toBe('15/11/2026'); expect(f.arrival.time).toBe('08:00');
    expect(f.departure.stops).toBe(1); expect(f.stopInfo).toEqual({ stop1: 'HAN', waitTime: '10h 10m' });
    expect(f.duration).toBe('5h 45m'); expect(vnaWaitTime(out[0], out[1])).toBe('10h 10m');
  });
  test('RT direct uses whole-option price, not a price per segment', () => {
    const f = parse(itinerary([out[0]], [back[1]])); expect(f.departure.stops).toBe(0); expect(f.return?.stops).toBe(0); expect(f.price).toBe(987600);
  });
  test('RT connections retain all four exact segments M/M/N/N and contacts in booking-v3', () => {
    const i = itinerary(out, back); const f = parse(i); const booking = vnaBookingFlight(f);
    expect(booking.legs.map(s => s.flightNumber)).toEqual(['VN415', 'VN1715', 'VN1269', 'VN402']);
    expect(booking.legs.map(s => s.ticketClass)).toEqual(['M', 'M', 'N', 'N']);
    const request = buildVnaBookingV3(booking, [{ Họ: 'A', Tên: 'B', Giới_tính: 'nam', type: 'người_lớn' }], 'STU', 'form@example.com', '+821012345678', 'user-id');
    expect(request.body.list_itinerary).toEqual(i);
    expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({ doituong: 'STU', email: 'form@example.com', phone: '+821012345678', id_f2: 'user-id' });
    expect(f.return?.departure.airport).toBe('VII'); expect(f.return?.arrival.airport).toBe('ICN');
  });
  test('mixed RT and three-segment directions count stops independently', () => {
    const f = parse(itinerary(out, [back[0]])); expect(f.departure.stops).toBe(1); expect(f.return?.stops).toBe(0);
    expect(parse(itinerary([...out, back[0]])).departure.stops).toBe(2);
  });
  test('empty results and stale V4 objects do not crash; old selections cannot book', () => {
    expect(parseVnaV5([], 'ADT', s => s)).toEqual([]);
    expect(parseVnaV5([{ ...itinerary(), chiều_đi: segment() } as unknown as VnaItineraryV5], 'ADT', s => s)).toEqual([]);
    expect(() => vnaBookingFlight({ ...parse(itinerary()), vnaItinerary: undefined })).toThrow();
  });
  test('OW/RT and MD search POST only to V5 while retaining request contracts', async () => {
    const original = globalThis.fetch; const calls: { url: string; body: any }[] = [];
    globalThis.fetch = (async (url, init) => { calls.push({ url: String(url), body: JSON.parse(String(init?.body)) }); return new Response(JSON.stringify({ status_code: 200, body: [itinerary(out, back)] })); }) as typeof fetch;
    try {
      await fetchVNAFlightsV5({ from: 'ICN', to: 'VII', departureDate: new Date(2026, 10, 14), returnDate: new Date(2026, 10, 21), passengers: 1, tripType: 'round_trip', ptcCode: 'VFR' });
      await fetchVNAFlightsV5({ from: 'ICN', to: 'VII', departureDate: new Date(2026, 10, 14), returnDate: undefined, passengers: 1, tripType: 'one_way' });
      await fetchVNAMultiCity({ legs: [{ origin: 'ICN', destination: 'HAN', date: new Date(2026, 10, 14) }], passengers: 1, ptcCode: 'VFR' });
      expect(calls.map(c => c.url)).toEqual(Array(3).fill('https://apilive.hanvietair.com/vna/check-ve-v5'));
      expect(calls[0].body).toMatchObject({ trip_type: 'RT', depart_date: '2026-11-14', return_date: '2026-11-21', ptc_code: 'VFR' });
      expect(calls[1].body.trip_type).toBe('OW'); expect(calls[2].body.trip_type).toBe('MD');
    } finally { globalThis.fetch = original; }
  });
});