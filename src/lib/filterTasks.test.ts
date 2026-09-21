import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import { buildIndex } from './hierarchy';
import { filterTasks } from './search';
import { taskTitle } from './text';

const NOW = new Date(2026, 8, 21, 9, 0);
const snapshot = createDemoSnapshot(NOW);
const index = buildIndex(snapshot);
const titles = (query: string) => filterTasks(snapshot.tasks, query, index, snapshot.people).map((t) => taskTitle(t.content));

describe('filterTasks — the search box on holder and project pages', () => {
  it('keeps every task for an empty query', () => {
    expect(filterTasks(snapshot.tasks, '  ', index, snapshot.people)).toHaveLength(snapshot.tasks.length);
  });

  it('matches the task name, ignoring case', () => {
    expect(titles('lms')).toContain('Develop LMS-style Onboarding System');
  });

  it('needs every word, in any order', () => {
    const both = titles('onboarding lms');
    expect(both).toContain('Develop LMS-style Onboarding System');
    expect(titles('lms zzzz-nothing')).toEqual([]);
  });

  it('finds tasks by their section, project and holder too', () => {
    const lms = snapshot.tasks.find((t) => taskTitle(t.content) === 'Develop LMS-style Onboarding System')!;
    const holder = snapshot.people[lms.responsible_uid!].name;
    expect(filterTasks([lms], 'on board process', index, snapshot.people)).toHaveLength(1);
    expect(filterTasks([lms], holder, index, snapshot.people)).toHaveLength(1);
  });

  it('finds a task by the dates written in its title', () => {
    const lms = snapshot.tasks.find((t) => taskTitle(t.content) === 'Develop LMS-style Onboarding System')!;
    const cd = lms.content.split(',')[0];
    expect(filterTasks([lms], cd, index, snapshot.people)).toHaveLength(1);
  });
});
