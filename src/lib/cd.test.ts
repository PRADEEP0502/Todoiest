import { describe, expect, it } from 'vitest';
import { buildTitle, cdFromApiDate, formatCd, hasCd, hasIdd, lockedDatesIntact, parseTitle, titleDateToKey, titleForNewTask, titleForSavedTask } from './cd';

const stored = (content: string, extra: { addedAt?: string | null; routine?: boolean } = {}) => ({
  content,
  addedAt: extra.addedAt ?? null,
  routine: extra.routine,
});

describe('dates in the task title (CD and IDD)', () => {
  it('formats dates as DD.MM.YY, from the clock and from Todoist', () => {
    expect(formatCd(new Date(2026, 8, 16))).toBe('16.09.26');
    expect(formatCd(new Date(2026, 0, 5))).toBe('05.01.26');
    // Read as written: a late-evening due date does not slide to the day before.
    expect(cdFromApiDate('2026-09-20')).toBe('20.09.26');
    expect(cdFromApiDate('2026-09-20T23:30:00Z')).toBe('20.09.26');
    expect(cdFromApiDate(null)).toBe(null);
  });

  it('reads the shapes this workspace actually uses in Todoist', () => {
    // Heading marker and bold wrap the whole name, dates included.
    expect(parseTitle('* **24.07.26,6T mechine**')).toEqual({ cd: '24.07.26', title: '* **6T mechine**', idd: null });
    expect(parseTitle('* **17.02.26,QAD ASSISTANT - 1 No, 23.02.26**')).toEqual({
      cd: '17.02.26',
      title: '* **QAD ASSISTANT - 1 No**',
      idd: '23.02.26',
    });
    // Only a space after the date, and a space before the comma.
    expect(parseTitle('15.08.26 Panel Board Ac Not Working').cd).toBe('15.08.26');
    expect(parseTitle('21.08.26 , To develop the company website')).toEqual({
      cd: '21.08.26',
      title: 'To develop the company website',
      idd: null,
    });
    // Saving keeps the marker, the bold and both dates exactly where they were.
    expect(buildTitle(parseTitle('* **17.02.26,QAD ASSISTANT - 1 No, 23.02.26**'))).toBe('* **17.02.26, QAD ASSISTANT - 1 No, 23.02.26**');
  });

  it('reads a heading task, whose "* " marker sits in front of the dates', () => {
    // Todoist headings look like "* 24.07.26,6T mechine" — the marker belongs to the title.
    expect(parseTitle('* 24.07.26,6T mechine')).toEqual({ cd: '24.07.26', title: '* 6T mechine', idd: null });
    expect(parseTitle('* 15.08.26, LMS, 18.8.26')).toEqual({ cd: '15.08.26', title: '* LMS', idd: '18.8.26' });
    // Todoist writes the marker with a non-breaking space as well as a plain one.
    expect(parseTitle('* 24.07.26,6T mechine').cd).toBe('24.07.26');
    // Saving one keeps it a heading, and keeps both dates where they were.
    expect(buildTitle(parseTitle('* 15.08.26, LMS, 18.8.26'))).toBe('* 15.08.26, LMS, 18.8.26');
    expect(titleForSavedTask({ content: '* 24.07.26,6T mechine', addedAt: '2026-07-24T06:00:00Z' }, '* 6T mechine', null)).toBe('* 24.07.26, 6T mechine');
  });

  it('reads a date written with commas, as this workspace sometimes does', () => {
    expect(parseTitle('13,08,26,Flow meter,A flow meter needs to be installed on the slit-open machine.')).toEqual({
      cd: '13,08,26',
      title: 'Flow meter,A flow meter needs to be installed on the slit-open machine.',
      idd: null,
    });
    expect(titleDateToKey('13,08,26')).toBe('2026-08-13');
    // A plain list of numbers is not a date.
    expect(parseTitle('3,4,5 rolls to be checked').cd).toBeNull();
    expect(titleDateToKey('13,08.26')).toBeNull();
  });

  it('reads dates written with dashes or slashes as well as dots', () => {
    expect(parseTitle('19-09-26. P1 machine dyes are dosing automatically.').cd).toBe('19-09-26');
    expect(titleDateToKey('19-09-26')).toBe('2026-09-19');
    expect(titleDateToKey('18/08/2026')).toBe('2026-08-18');
    // Not dates: a plain range, and one that mixes its separators.
    expect(parseTitle('A 5-10 range task').cd).toBeNull();
    expect(titleDateToKey('1.2-26')).toBeNull();
  });

  it('accepts the full stop this workspace also writes after CD', () => {
    expect(parseTitle('11.09.26.Sensor, magnet sensor is not working.')).toEqual({
      cd: '11.09.26',
      title: 'Sensor, magnet sensor is not working.',
      idd: null,
    });
  });

  it('reads the title exactly as it is written in the real workspace', () => {
    // From a live Todoist task: zero-padded CD, unpadded IDD.
    expect(parseTitle('15.08.26, Develop an LMS-style Onboarding System for New Employees, 18.8.26')).toEqual({
      cd: '15.08.26',
      title: 'Develop an LMS-style Onboarding System for New Employees',
      idd: '18.8.26',
    });
    expect(parseTitle('5.8.26, Short day and month, 8.8.2026')).toEqual({ cd: '5.8.26', title: 'Short day and month', idd: '8.8.2026' });
    expect(parseTitle('16.09.26, No issue date yet')).toEqual({ cd: '16.09.26', title: 'No issue date yet', idd: null });
    expect(parseTitle('Plain task')).toEqual({ cd: null, title: 'Plain task', idd: null });
    // Commas inside the title survive; a date inside the sentence is not a date of ours.
    expect(parseTitle('16.09.26, Buy milk, eggs, 20.09.26')).toEqual({ cd: '16.09.26', title: 'Buy milk, eggs', idd: '20.09.26' });
    expect(parseTitle('Meet on 16.09.26')).toEqual({ cd: null, title: 'Meet on 16.09.26', idd: null });
  });

  it('only accepts real calendar days', () => {
    expect(titleDateToKey('15.08.26')).toBe('2026-08-15');
    expect(titleDateToKey('8.9.26')).toBe('2026-09-08');
    expect(titleDateToKey('08.09.2026')).toBe('2026-09-08');
    expect(titleDateToKey('31.02.26')).toBeNull();
    expect(titleDateToKey('00.01.26')).toBeNull();
    expect(titleDateToKey('15-08-26')).toBe('2026-08-15'); // dashes are written here too
    expect(titleDateToKey('15.08-26')).toBeNull();
    expect(parseTitle('31.02.26, Not a date, 99.99.26')).toEqual({ cd: null, title: '31.02.26, Not a date, 99.99.26', idd: null });
  });

  it('writes CD from the clock on a new task, and IDD only when a person entered one', () => {
    const now = new Date(2026, 7, 15);
    expect(titleForNewTask('Develop LMS Portal', now, '2026-08-18')).toBe('15.08.26, Develop LMS Portal, 18.08.26');
    // No issue date entered: none is invented — not from the due date, not from anything else.
    expect(titleForNewTask('  Spaced out  ', now, null)).toBe('15.08.26, Spaced out');
    // Dates typed by hand on a new task are kept, exactly as written, rather than doubled.
    expect(titleForNewTask('01.02.26, Already dated, 5.2.26', now, '2026-09-20')).toBe('01.02.26, Already dated, 5.2.26');
  });

  it('keeps CD and IDD exactly as written when the task is renamed, moved or rescheduled', () => {
    const task = stored('15.08.26, Develop LMS Portal, 18.8.26');
    // Only the name is taken from the form; the unpadded "18.8.26" is not reformatted.
    expect(titleForSavedTask(task, 'Renamed completely', null)).toBe('15.08.26, Renamed completely, 18.8.26');
    // Whatever IDD is offered, a stored one always wins.
    expect(titleForSavedTask(task, 'Develop LMS Portal', '2030-01-01')).toBe('15.08.26, Develop LMS Portal, 18.8.26');
  });

  it('records an issue date once — when a person enters it — and never rewrites it', () => {
    const noIdd = stored('15.08.26, Develop LMS Portal');
    const first = titleForSavedTask(noIdd, 'Develop LMS Portal', '2026-08-18');
    expect(first).toBe('15.08.26, Develop LMS Portal, 18.08.26');
    // From then on the title carries it, and a second attempt changes nothing.
    expect(titleForSavedTask(stored(first), 'Develop LMS Portal', '2026-12-31')).toBe(first);
    // No date entered: nothing is written (the due date is not an issue date).
    expect(titleForSavedTask(noIdd, 'Develop LMS Portal', null)).toBe('15.08.26, Develop LMS Portal');
  });

  it('fills a missing creation date once, from when Todoist says the task was added', () => {
    const task = stored('Task from before the dashboard', { addedAt: '2025-03-12T08:15:00.000000Z' });
    expect(titleForSavedTask(task, 'Task from before the dashboard', null)).toBe('12.03.25, Task from before the dashboard');
    // Nothing to go on: the title stays as it is rather than being back-dated to today.
    expect(titleForSavedTask(stored('No record'), 'No record', null)).toBe('No record');
  });

  it('drops a date typed into the name of a saved task instead of recording it', () => {
    const bare = stored('Task');
    expect(titleForSavedTask(bare, '05.05.25, Task, 06.06.25', null)).toBe('Task');
    const dated = stored('15.08.26, Task, 18.8.26');
    expect(titleForSavedTask(dated, '01.01.20, Task, 02.02.20', null)).toBe('15.08.26, Task, 18.8.26');
  });

  it('writes no dates at all on routine work, but never strips ones already there', () => {
    expect(titleForNewTask('Daily report', new Date(2026, 8, 16), '2026-09-20', true)).toBe('Daily report');
    const routine = stored('Daily report', { addedAt: '2025-03-12T08:15:00.000000Z', routine: true });
    expect(titleForSavedTask(routine, 'Daily report renamed', '2026-09-20')).toBe('Daily report renamed');
    const dated = stored('16.09.26, Daily report, 20.09.26', { routine: true });
    expect(titleForSavedTask(dated, 'Daily report', null)).toBe('16.09.26, Daily report, 20.09.26');
  });

  it('refuses any title that would change or drop a stored date', () => {
    const before = '15.08.26, Task, 18.8.26';
    expect(lockedDatesIntact(before, '15.08.26, Renamed, 18.8.26')).toBe(true);
    expect(lockedDatesIntact(before, '16.08.26, Task, 18.8.26')).toBe(false);
    expect(lockedDatesIntact(before, '15.08.26, Task, 18.08.26')).toBe(false); // even a reformat
    expect(lockedDatesIntact(before, '15.08.26, Task')).toBe(false);
    expect(lockedDatesIntact(before, 'Task')).toBe(false);
    // Nothing stored yet: recording a date for the first time is allowed.
    expect(lockedDatesIntact('Task', '15.08.26, Task, 18.08.26')).toBe(true);
    expect(lockedDatesIntact('15.08.26, Task', '15.08.26, Task, 18.08.26')).toBe(true);
  });

  it('recognises which tasks carry which date', () => {
    expect(hasCd('16.09.26, Task')).toBe(true);
    expect(hasCd('Task, 20.09.26')).toBe(false);
    expect(hasIdd('16.09.26, Task, 20.09.26')).toBe(true);
    expect(hasIdd('16.09.26, Task')).toBe(false);
  });

  it('puts a title back together without doubling dates', () => {
    expect(buildTitle({ cd: '16.09.26', title: 'Task', idd: '20.09.26' })).toBe('16.09.26, Task, 20.09.26');
    expect(buildTitle({ cd: '16.09.26', title: '16.09.26, Task, 20.09.26', idd: '20.09.26' })).toBe('16.09.26, Task, 20.09.26');
    expect(buildTitle({ cd: null, title: 'Task', idd: null })).toBe('Task');
  });
});
