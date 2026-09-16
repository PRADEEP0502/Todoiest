import { describe, expect, it } from 'vitest';
import { formatCd, hasCd, splitCd, titleWithCreationDate, withCd } from './cd';

describe('creation date (CD)', () => {
  it('formats the current date as DD.MM.YY', () => {
    expect(formatCd(new Date(2026, 8, 16))).toBe('16.09.26');
    expect(formatCd(new Date(2026, 0, 5))).toBe('05.01.26');
  });

  it('adds the creation date to a new task title', () => {
    expect(titleWithCreationDate('Develop LMS Portal', new Date(2026, 8, 16))).toBe('16.09.26, Develop LMS Portal');
    expect(titleWithCreationDate('  Spaced out  ', new Date(2026, 8, 17))).toBe('17.09.26, Spaced out');
  });

  it('never doubles a date the person typed themselves', () => {
    expect(titleWithCreationDate('01.02.26, Already dated', new Date(2026, 8, 16))).toBe('01.02.26, Already dated');
  });

  it('separates an existing creation date from the title', () => {
    expect(splitCd('16.09.26, Develop LMS Portal')).toEqual({ cd: '16.09.26', title: 'Develop LMS Portal' });
    expect(splitCd('16.09.26,No space')).toEqual({ cd: '16.09.26', title: 'No space' });
    expect(splitCd('Plain task')).toEqual({ cd: null, title: 'Plain task' });
    // A date that is part of the sentence is not a creation date.
    expect(splitCd('Meet on 16.09.26')).toEqual({ cd: null, title: 'Meet on 16.09.26' });
  });

  it('keeps the original date when the title is rewritten', () => {
    expect(withCd('Completely new title', '16.09.26')).toBe('16.09.26, Completely new title');
    expect(withCd('16.09.26, Old title edited', '16.09.26')).toBe('16.09.26, Old title edited');
  });

  it('recognises which tasks carry a creation date', () => {
    expect(hasCd('16.09.26, Task')).toBe(true);
    expect(hasCd('Task without date')).toBe(false);
  });
});
