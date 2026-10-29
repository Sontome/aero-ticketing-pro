import { describe, expect, test } from 'bun:test';
import { buildVnaBookingV3, type VnaFormPassenger } from '../src/lib/vnaBookingV3';
import { bookVnaMultiCity } from '../src/services/vnaBookingV3';
import type { MultiCityFlight } from '../src/services/vnaMultiCityApi';

const flight: MultiCityFlight = {
  id: 'md', price: 684100, availableSeats: 9, baggageType: 'VFR',
  legs: [
    { index: 1, from: 'ICN', to: 'HAN', flightNumber: 'VN417', ticketClass: 'M', departureDate: '30/10/2026', departureTime: '10:30', arrivalDate: '30/10/2026', arrivalTime: '13:00', stops: 0 },
    { index: 2, from: 'HAN', to: 'VII', flightNumber: 'VN1717', ticketClass: 'M', departureDate: '30/10/2026', departureTime: '16:00', arrivalDate: '30/10/2026', arrivalTime: '17:00', stops: 0 },
    { index: 3, from: 'HAN', to: 'ICN', flightNumber: 'VN414', ticketClass: 'T', departureDate: '11/12/2026', departureTime: '10:00', arrivalDate: '11/12/2026', arrivalTime: '16:00', stops: 0 },
  ],
  listItinerary: { chặng_1: { custom: 'retained' }, thông_tin_chung: { giá_vé: '684100' } },
};
const adult: VnaFormPassenger = { Họ: 'Nguyễn', Tên: ' Văn A ', Giới_tính: 'nam', type: 'người_lớn' };
const input = (passengers = [adult]): Parameters<typeof buildVnaBookingV3> => [flight, passengers, 'VFR', 'ticket@example.com', '+84901234567', 'user-f2'];

describe('VNA booking-v3 guide contract', () => {
  test('uses booking-v3 with delivery email, encoded phone, user id and search fare in query', () => {
    const r = buildVnaBookingV3(...input()); const url = new URL(r.url);
    expect(url.origin + url.pathname).toBe('https://apilive.hanvietair.com/vna/booking-v3');
    expect(url.searchParams.get('email')).toBe('ticket@example.com');
    expect(url.searchParams.get('phone')).toBe('+84901234567'); expect(r.url).toContain('phone=%2B84901234567');
    expect(url.searchParams.get('id_f2')).toBe('user-f2'); expect(url.searchParams.get('doituong')).toBe('VFR');
    expect(r.body).not.toHaveProperty('fare_type');
    const stu = input(); stu[2] = 'STU'; expect(new URL(buildVnaBookingV3(...stu).url).searchParams.get('doituong')).toBe('STU');
  });
  test('keeps all three exact flights, classes, dates and extra itinerary fields', () => {
    const itinerary = buildVnaBookingV3(...input()).body.list_itinerary;
    expect(itinerary.chặng_1).toMatchObject({ custom: 'retained', hãng: 'VNA', số_hiệu_máy_bay: 'VN417', loại_vé: 'M', ngày_cất_cánh: '30/10/2026', nơi_đi: 'ICN', nơi_đến: 'HAN' });
    expect(itinerary.chặng_2).toMatchObject({ số_hiệu_máy_bay: 'VN1717', loại_vé: 'M' });
    expect(itinerary.chặng_3).toMatchObject({ số_hiệu_máy_bay: 'VN414', loại_vé: 'T', ngày_cất_cánh: '11/12/2026' });
    expect(itinerary.thông_tin_chung).toEqual({ giá_vé: '684100' });
  });
  test('sends passenger objects with surname first_name, given last_name and separate infant DOB', () => {
    const p = buildVnaBookingV3(...input([adult, { ...adult, Tên: 'VAN B', type: 'trẻ_em', Ngày_sinh: new Date(2018, 4, 15) }, { ...adult, Tên: 'THI D', Giới_tính: 'nữ', infant: { Họ: 'Nguyễn', Tên: 'THI C', Giới_tính: 'nữ', Ngày_sinh: new Date(2026, 0, 20) } }])).body.passengers;
    expect(p.adults).toEqual([{ first_name: 'NGUYEN', last_name: 'THI D', gender: 'F' }, { first_name: 'NGUYEN', last_name: 'VAN A', gender: 'M' }]);
    expect(p.children[0]).toEqual({ first_name: 'NGUYEN', last_name: 'VAN B', gender: 'M', dob: '15/05/2018' });
    expect(p.infants[0]).toEqual({ first_name: 'NGUYEN', last_name: 'THI C', gender: 'F', dob: '20/01/2026' });
  });
  test('requires signed-in F2 and both contacts', () => {
    for (const index of [3, 4, 5] as const) { const args = input(); args[index] = ''; expect(() => buildVnaBookingV3(...args)).toThrow(); }
  });
  test('rejects missing seats, invalid flights, dates and incomplete children/infants', () => {
    const args = input(); args[0] = { ...flight, availableSeats: 0 }; expect(() => buildVnaBookingV3(...args)).toThrow();
    for (const patch of [{ flightNumber: '' }, { ticketClass: '' }, { departureDate: '31/02/2026' }]) {
      args[0] = { ...flight, legs: [{ ...flight.legs[0], ...patch }] }; expect(() => buildVnaBookingV3(...args)).toThrow();
    }
    expect(() => buildVnaBookingV3(...input([{ ...adult, type: 'trẻ_em' }]))).toThrow();
    expect(() => buildVnaBookingV3(...input([{ ...adult, infant: { Họ: 'A', Tên: 'B', Giới_tính: 'nam' } }]))).toThrow();
  });
  test('posts JSON once and accepts documented Vietnamese success fields', async () => {
    const calls: RequestInit[] = [];
    const result = await bookVnaMultiCity(input(), (async (_, options) => { calls.push(options ?? {}); return new Response(JSON.stringify({ mã_giữ_vé: 'ABC123', hạn_thanh_toán: '15:30 29/10/2026', mess: 'Giữ vé VNA thành công!' })); }) as typeof fetch);
    expect(result.pnr).toBe('ABC123'); expect(calls).toHaveLength(1); expect(calls[0].method).toBe('POST');
    expect(JSON.parse(String(calls[0].body)).passengers.adults[0]).toEqual({ first_name: 'NGUYEN', last_name: 'VAN A', gender: 'M' });
  });
  test('HTTP 200 Error, missing PNR, 422 and network errors fail without retry', async () => {
    for (const [data, status] of [[{ status: 'Error', responses: [] }, 200], [{ mess: 'no PNR' }, 200], [{ detail: 'invalid input' }, 422]] as const) {
      let calls = 0;
      await expect(bookVnaMultiCity(input(), (async () => { calls++; return new Response(JSON.stringify(data), { status }); }) as typeof fetch)).rejects.toThrow();
      expect(calls).toBe(1);
    }
    let calls = 0;
    await expect(bookVnaMultiCity(input(), (async () => { calls++; throw new Error('network'); }) as typeof fetch)).rejects.toThrow(); expect(calls).toBe(1);
  });
});