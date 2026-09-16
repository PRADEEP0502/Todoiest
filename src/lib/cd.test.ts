import { describe, expect, it } from 'vitest';
import { buildTitle, cdFromApiDate, formatCd, hasCd, hasIdd, parseTitle, titleForNewTask, titleForSavedTask } from './cd';

const stored = (content: string, extra: { addedAt?: string | null; hasDueDate?: boolean } = {}) => ({
  content,
  addedAt: extra.addedAt ?? null,
  hasDueDate: extra.hasDueDate ?? false,
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

  it('splits a title into creation date, title and initial due date', () => {
    expect(parseTitle('16.09.26, Develop LMS Portal, 20.09.26')).toEqual({ cd: '16.09.26', title: 'Develop LMS Portal', idd: '20.09.26' });
    expect(parseTitle('16.09.26, No due date yet')).toEqual({ cd: '16.09.26', title: 'No due date yet', idd: null });
    expect(parseTitle('Plain task')).toEqual({ cd: null, title: 'Plain task', idd: null });
    // Commas inside the title survive; a date inside the sentence is not a date of ours.
    expect(parseTitle('16.09.26, Buy milk, eggs, 20.09.26')).toEqual({ cd: '16.09.26', title: 'Buy milk, eggs', idd: '20.09.26' });
    expect(parseTitle('Meet on 16.09.26')).toEqual({ cd: null, title: 'Meet on 16.09.26', idd: null });
  });

  it('writes both dates on a new task, and only the creation date when there is no due date', () => {
    const now = new Date(2026, 8, 16);
    expect(titleForNewTask('Develop LMS Portal', now, '2026-09-20')).toBe('16.09.26, Develop LMS Portal, 20.09.26');
    expect(titleForNewTask('  Spaced out  ', now, null)).toBe('16.09.26, Spaced out');
    // Dates typed by hand are kept rather than doubled.
    expect(titleForNewTask('01.02.26, Already dated, 05.02.26', now, '2026-09-20')).toBe('01.02.26, Already dated, 05.02.26');
  });

  it('keeps both dates when the task is edited or rescheduled', () => {
    const task = stored('16.09.26, Develop LMS Portal, 20.09.26', { hasDueDate: true });
    expect(titleForSavedTask(task, 'Develop LMS Portal', '2026-09-25')).toBe('16.09.26, Develop LMS Portal, 20.09.26');
    expect(titleForSavedTask(task, 'Renamed completely', null)).toBe('16.09.26, Renamed completely, 20.09.26');
  });

  it('captures the first due date a task is ever given', () => {
    const task = stored('16.09.26, Develop LMS Portal');
    expect(titleForSavedTask(task, 'Develop LMS Portal', '2026-09-20')).toBe('16.09.26, Develop LMS Portal, 20.09.26');
    // Still no due date: nothing to record.
    expect(titleForSavedTask(task, 'Develop LMS Portal', null)).toBe('16.09.26, Develop LMS Portal');
  });

  it('never invents a first due date for a task that already had one', () => {
    const task = stored('16.09.26, Older task', { hasDueDate: true });
    expect(titleForSavedTask(task, 'Older task', '2026-09-25')).toBe('16.09.26, Older task');
  });

  it('fills a missing creation date from when Todoist says the task was added', () => {
    const task = stored('Task from before the dashboard', { addedAt: '2025-03-12T08:15:00.000000Z' });
    expect(titleForSavedTask(task, 'Task from before the dashboard', null)).toBe('12.03.25, Task from before the dashboard');
    // Nothing to go on: the title stays as it is rather than being back-dated to today.
    expect(titleForSavedTask(stored('No record'), 'No record', null)).toBe('No record');
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
