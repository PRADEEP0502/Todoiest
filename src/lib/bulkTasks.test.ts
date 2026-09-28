import { describe, expect, it } from 'vitest';
import { describeCount, droppedLines, MAX_BULK_TASKS, MAX_TASK_LENGTH, parseBulkLines } from './bulkTasks';

const names = (text: string) => parseBulkLines(text).map((l) => l.name);

describe('turning a paste into tasks', () => {
  it('makes one task per line, in the order written', () => {
    expect(names('Task 1\nTask 2\nTask 3\nTask 4\nTask 5')).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']);
  });

  it('ignores blank lines and stray spaces', () => {
    expect(names('  Get quotation  \n\n\n   \nCompare rates\n')).toEqual(['Get quotation', 'Compare rates']);
    expect(names('   \n \n')).toEqual([]);
  });

  it('drops a bullet, a number or a checkbox in front of a line', () => {
    expect(names('- Get quotation\n* Compare rates\n• Call vendor\n1. Get MD approval\n2) Raise PO\n[ ] Check stock\n[x] Done already')).toEqual([
      'Get quotation',
      'Compare rates',
      'Call vendor',
      'Get MD approval',
      'Raise PO',
      'Check stock',
      'Done already',
    ]);
  });

  it('keeps the words exactly, including dates written in the title', () => {
    expect(names('15.08.26, Develop LMS Portal, 18.8.26')).toEqual(['15.08.26, Develop LMS Portal, 18.8.26']);
    // A dash inside the sentence is not a bullet.
    expect(names('Panel board - check wiring')).toEqual(['Panel board - check wiring']);
  });

  it('gives every line its own id, so each keeps its own holder', () => {
    expect(parseBulkLines('a\nb\nc').map((l) => l.id)).toEqual([0, 1, 2]);
  });

  it('creates no more than a hundred at once, and says how many were left out', () => {
    const paste = Array.from({ length: 130 }, (_, i) => `Task ${i + 1}`).join('\n');
    expect(parseBulkLines(paste)).toHaveLength(MAX_BULK_TASKS);
    expect(droppedLines(paste)).toBe(30);
    expect(droppedLines('a\nb')).toBe(0);
  });

  it('cuts a line that is longer than Todoist accepts', () => {
    expect(names('x'.repeat(MAX_TASK_LENGTH + 50))[0]).toHaveLength(MAX_TASK_LENGTH);
  });

  it('counts in words', () => {
    expect(describeCount(10)).toBe('10 tasks ready to create');
    expect(describeCount(1)).toBe('1 task ready to create');
    expect(describeCount(0)).toBe('0 tasks ready to create');
    expect(describeCount(10, 'created successfully')).toBe('10 tasks created successfully');
  });
});
