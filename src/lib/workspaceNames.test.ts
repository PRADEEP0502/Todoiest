import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import { buildIndex } from './hierarchy';
import { workspaceNames } from './workspaceNames';

const snapshot = createDemoSnapshot(new Date(2026, 9, 5, 9, 0));
const index = buildIndex(snapshot);

describe('the names this workspace uses', () => {
  const names = workspaceNames(index, snapshot);

  it('includes its projects, sections and people', () => {
    expect(names).toContain('RV');
    expect(names).toContain('Site Visits');
    expect(names).toContain('Pradeep');
  });

  it('picks up the short machine-and-system names from task titles', () => {
    const titles = snapshot.tasks.map((t) => t.content).join(' ');
    if (/\bLMS\b/.test(titles)) expect(names).toContain('LMS');
    // Ordinary words are not names.
    expect(names).not.toContain('the');
    expect(names).not.toContain('Prepare');
  });

  it('sends a workable number of them, each one real', () => {
    expect(names.length).toBeGreaterThan(5);
    expect(names.length).toBeLessThanOrEqual(80);
    expect(names.every((n) => n.trim().length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('says nothing at all before the first sync', () => {
    expect(workspaceNames(null, null)).toEqual([]);
    expect(workspaceNames(index, null)).toEqual([]);
  });
});

describe('what gets room in the list', () => {
  it('keeps the machine names when a long list of projects would have crowded them out', () => {
    const crowded = createDemoSnapshot(new Date(2026, 9, 5, 9, 0));
    const first = crowded.projects[0];
    for (let n = 0; n < 120; n++) {
      crowded.projects.push({ ...first, id: `filler-${n}`, name: `Filler Project ${n}`, parent_id: null });
    }
    crowded.tasks[0].content = '24.07.26,6T mechine pump button, 30.07.26';
    const names = workspaceNames(buildIndex(crowded), crowded);
    expect(names).toContain('6T');
    // And the real projects still make it in beside the machine names.
    expect(names).toContain('RV');
    expect(names.length).toBeLessThanOrEqual(80);
  });
});
