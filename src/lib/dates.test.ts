import { describe, expect, it } from 'vitest';
import { describeDue, dueDateKey, dueTime, upcomingBucket } from './dates';
import { completedRangeStart } from './stats';

const NOW = new Date(2026, 8, 16, 11, 0); // Wednesday 16 Sep 2026

describe('due dates', () => {
  it('reads floating dates as local calendar dates', () => {
    expect(dueDateKey({ date: '2026-09-16' })).toBe('2026-09-16');
    expect(dueDateKey({ date: '2026-09-16T23:30:00' })).toBe('2026-09-16');
    expect(dueTime({ date: '2026-09-16T09:05:00' })).toBe('09:05');
    expect(dueTime({ date: '2026-09-16' })).toBeNull();
  });

  it('converts fixed-timezone datetimes to the local date', () => {
    const utc = '2026-09-16T12:00:00Z';
    const local = new Date(utc);
    const expected = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
    expect(dueDateKey({ date: utc })).toBe(expected);
  });

  it('describes due dates relative to today', () => {
    expect(describeDue({ date: '2026-09-16' }, NOW)).toEqual({ label: 'Today', tone: 'today' });
    expect(describeDue({ date: '2026-09-17' }, NOW)).toEqual({ label: 'Tomorrow', tone: 'soon' });
    expect(describeDue({ date: '2026-09-15' }, NOW)).toEqual({ label: 'Yesterday', tone: 'overdue' });
    expect(describeDue({ date: '2026-09-18T14:00:00' }, NOW)?.label).toBe('Friday 14:00');
    expect(describeDue({ date: '2026-10-02' }, NOW)).toEqual({ label: '2 Oct', tone: 'later' });
    expect(describeDue(null, NOW)).toBeNull();
  });
});

describe('upcomingBucket', () => {
  it('buckets into today, tomorrow, weekdays, next week and months', () => {
    expect(upcomingBucket('2026-09-16', NOW).label).toBe('Today');
    expect(upcomingBucket('2026-09-17', NOW).label).toBe('Tomorrow');
    expect(upcomingBucket('2026-09-18', NOW).label).toBe('Friday');
    expect(upcomingBucket('2026-09-22', NOW).label).toBe('Tuesday'); // within 7 days
    expect(upcomingBucket('2026-09-23', NOW).id).toBe('next-week'); // next calendar week (21–27 Sep)
    expect(upcomingBucket('2026-09-27', NOW).id).toBe('next-week');
    expect(upcomingBucket('2026-09-28', NOW)).toEqual({ id: '2026-09', label: 'September' });
    expect(upcomingBucket('2027-01-05', NOW).label).toBe('January 2027');
  });
});

describe('completed ranges', () => {
  it('starts today at midnight, this week on Monday, this month on the 1st', () => {
    expect(completedRangeStart('today', NOW)).toEqual(new Date(2026, 8, 16));
    expect(completedRangeStart('week', NOW)).toEqual(new Date(2026, 8, 14));
    expect(completedRangeStart('month', NOW)).toEqual(new Date(2026, 8, 1));
  });
});
