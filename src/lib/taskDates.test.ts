import { describe, expect, it } from 'vitest';
import { titleForNewTask, titleForSavedTask } from './cd';
import { longFromDateKey, longFromTitleDate, taskDates } from './taskDates';

const task = (content: string, extra: { added_at?: string | null; due?: string | null } = {}) => ({
  content,
  added_at: extra.added_at ?? null,
  due: extra.due ? { date: extra.due } : null,
});

describe('the three dates of a task', () => {
  it('reads CD and IDD from the title and DD from Todoist’s due date', () => {
    const d = taskDates(task('15.08.26, Develop LMS Portal, 18.8.26', { due: '2026-08-25' }));
    expect(d).toMatchObject({
      title: 'Develop LMS Portal',
      cd: '15-08-2026',
      cdKey: '2026-08-15',
      cdFrom: 'title',
      idd: '18-08-2026',
      iddKey: '2026-08-18',
      dd: '25-08-2026',
      ddKey: '2026-08-25',
    });
  });

  it('shows the creation stamp Todoist itself holds when the title has no CD yet', () => {
    // Mid-day, so the same calendar day in every time zone.
    const d = taskDates(task('Made in the Todoist app', { added_at: '2026-09-20T09:30:00.000000Z' }));
    expect(d.cd).toBe('20-09-2026');
    expect(d.cdFrom).toBe('todoist');
    expect(d.cdTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    expect(d.idd).toBeNull();
    expect(d.dd).toBeNull();
  });

  it('never invents an IDD or CD it has no evidence for', () => {
    const d = taskDates(task('Plain task', { due: '2026-09-25' }));
    expect(d.cd).toBeNull();
    expect(d.idd).toBeNull();
    expect(d.dd).toBe('25-09-2026');
  });

  it('converts short and ISO dates to DD-MM-YYYY', () => {
    expect(longFromTitleDate('05.01.27')).toBe('05-01-2027');
    expect(longFromTitleDate('5.1.27')).toBe('05-01-2027');
    expect(longFromDateKey('2026-09-25')).toBe('25-09-2026');
    expect(longFromTitleDate('nonsense')).toBeNull();
    expect(longFromDateKey(null)).toBeNull();
  });
});

describe('CD and IDD are locked, DD is editable', () => {
  const saved = '20.09.26, Develop LMS Portal, 21.09.26';
  const stored = { content: saved, addedAt: '2026-09-20T09:30:00Z' };

  it('keeps CD and IDD when only the due date changes — the due date is not part of the title', () => {
    // The due date never enters the title at all, so any DD change leaves both dates alone.
    expect(titleForSavedTask(stored, 'Develop LMS Portal', null)).toBe(saved);
  });

  it('keeps them when the name is edited, even if someone types other dates into it', () => {
    expect(titleForSavedTask(stored, 'Renamed', null)).toBe('20.09.26, Renamed, 21.09.26');
    expect(titleForSavedTask(stored, '01.01.20, Renamed, 02.02.20', null)).toBe('20.09.26, Renamed, 21.09.26');
  });

  it('a new task gets CD from the clock, and IDD only from what a person enters', () => {
    expect(titleForNewTask('Develop LMS Portal', new Date(2026, 8, 20), '2026-09-21')).toBe('20.09.26, Develop LMS Portal, 21.09.26');
    expect(titleForNewTask('Develop LMS Portal', new Date(2026, 8, 20), null)).toBe('20.09.26, Develop LMS Portal');
  });

  it('the creation date written back is the one that was shown, whatever the time zone', () => {
    const late = { content: 'Made in the app', addedAt: '2026-09-20T23:40:00.000000Z' };
    const shown = taskDates(task(late.content, { added_at: late.addedAt })).cd; // DD-MM-YYYY, local day
    const written = titleForSavedTask(late, 'Made in the app', null).split(',')[0]; // DD.MM.YY
    expect(longFromTitleDate(written)).toBe(shown);
  });
});
