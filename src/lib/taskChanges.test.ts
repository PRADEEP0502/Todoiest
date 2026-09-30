import { describe, expect, it } from 'vitest';
import { taskChanges } from './taskChanges';
import type { TodoistTask } from '../types/todoist';

const task = (over: Partial<TodoistTask> = {}): TodoistTask => ({
  id: 't1',
  project_id: 'p1',
  section_id: null,
  parent_id: null,
  content: '15.08.26, Fix the pump, 18.08.26',
  description: 'check the seal',
  priority: 1,
  due: { date: '2026-09-25' },
  labels: [],
  responsible_uid: 'u2',
  note_count: 0,
  child_order: 1,
  checked: false,
  added_at: null,
  completed_at: null,
  ...over,
});

const asIs = {
  content: '15.08.26, Fix the pump, 18.08.26',
  description: 'check the seal',
  dueDate: '2026-09-25',
  priority: 4 as const,
};

describe('what a save sends to Todoist', () => {
  it('sends nothing when nothing changed', () => {
    expect(taskChanges(task(), { ...asIs, assigneeId: 'u2' })).toEqual({});
  });

  it('leaves the holder alone when the form does not mention one', () => {
    // The aging page edits only a due date; the task must stay with whoever holds it.
    expect(taskChanges(task(), { ...asIs, dueDate: '2026-10-30' })).toEqual({ due_date: '2026-10-30' });
  });

  it('hands the task to someone else, or to nobody, when asked', () => {
    expect(taskChanges(task(), { ...asIs, assigneeId: 'u3' })).toEqual({ assignee_id: 'u3' });
    expect(taskChanges(task(), { ...asIs, assigneeId: null })).toEqual({ assignee_id: null });
    // Already held by nobody: nothing to send.
    expect(taskChanges(task({ responsible_uid: null }), { ...asIs, assigneeId: null })).toEqual({});
  });

  it('clears a due date in the words Todoist expects', () => {
    expect(taskChanges(task(), { ...asIs, dueDate: null })).toEqual({ due_string: 'no date' });
  });

  it('sends a new title, description or priority only when they differ', () => {
    expect(taskChanges(task(), { ...asIs, content: '15.08.26, Fix the pump seal, 18.08.26' })).toEqual({ content: '15.08.26, Fix the pump seal, 18.08.26' });
    expect(taskChanges(task(), { ...asIs, description: '  check the seal  ' })).toEqual({});
    expect(taskChanges(task(), { ...asIs, priority: 1 })).toEqual({ priority: 4 });
  });
});
