import { describe, it, expect } from 'vitest';
import { solarToLunar, getLunarMonthsOfYear } from '@taohoadon/shared';

describe('Vietnamese lunar calendar', () => {
  it.each([
    ['2020-01-25', { day: 1, month: 1, year: 2020, leap: false }], // Tết Canh Tý
    ['2024-02-10', { day: 1, month: 1, year: 2024, leap: false }], // Tết Giáp Thìn
    ['2025-01-29', { day: 1, month: 1, year: 2025, leap: false }], // Tết Ất Tỵ
    ['2026-02-17', { day: 1, month: 1, year: 2026, leap: false }], // Tết Bính Ngọ
    ['2026-09-25', { day: 15, month: 8, year: 2026, leap: false }], // Trung thu 2026
    ['2025-01-28', { day: 29, month: 12, year: 2024, leap: false }], // Giao thừa Ất Tỵ: no "30 Tết" that year
  ])('%s', (day, expected) => {
    expect(solarToLunar(day)).toEqual(expected);
  });

  it.each([
    [2020, 4, '2020-05-23'],
    [2023, 2, '2023-03-22'],
    [2025, 6, '2025-07-25'],
  ])('year %i has leap month %i starting %s', (year, month, start) => {
    const leap = getLunarMonthsOfYear(year).filter((m) => m.leap);
    expect(leap).toHaveLength(1);
    expect(leap[0]).toMatchObject({ month, start });
  });

  it('lists 12 months without gaps for a normal year', () => {
    const months = getLunarMonthsOfYear(2026);
    expect(months).toHaveLength(12);
    expect(months[0].start).toBe('2026-02-17');
    for (let i = 1; i < months.length; i++) {
      const prevEnd = new Date(months[i - 1].end);
      prevEnd.setUTCDate(prevEnd.getUTCDate() + 1);
      expect(prevEnd.toISOString().slice(0, 10)).toBe(months[i].start);
    }
  });
});
