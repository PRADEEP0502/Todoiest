import { describe, expect, it } from 'vitest';
import { QUOTES, quoteForDay } from './quotes';

const day = (offset: number) => new Date(2026, 0, 1 + offset, 9, 30);

describe('daily quote', () => {
  it('starts the run with “Small progress every day leads to big results.”', () => {
    expect(quoteForDay(new Date(2026, 8, 20, 10, 0))).toBe('Small progress every day leads to big results.');
  });

  it('is the same all day and changes the next day', () => {
    expect(quoteForDay(new Date(2026, 8, 20, 0, 5))).toBe(quoteForDay(new Date(2026, 8, 20, 23, 55)));
    expect(quoteForDay(day(0))).not.toBe(quoteForDay(day(1)));
  });

  it('shows every quote before any of them comes back', () => {
    for (const start of [0, 37, 200, 4001]) {
      const window = Array.from({ length: QUOTES.length }, (_, i) => quoteForDay(day(start + i)));
      expect(new Set(window).size).toBe(QUOTES.length);
    }
  });

  it('never shows the same quote on two days in a row, across many cycles', () => {
    for (let i = 0; i < QUOTES.length * 6; i++) expect(quoteForDay(day(i))).not.toBe(quoteForDay(day(i + 1)));
  });

  it('keeps every quote short', () => {
    for (const q of QUOTES) expect(q.length).toBeLessThanOrEqual(70);
    expect(new Set(QUOTES).size).toBe(QUOTES.length);
  });
});
