import { describe, expect, it } from 'vitest';
import { href, parseHash } from './useRoute';

describe('holder addresses', () => {
  it('round-trips a holder page with its filters', () => {
    const url = href.holder('u 1', { show: 'overdue', projectId: 'p9', sectionId: 's3' });
    expect(parseHash(url)).toEqual({ name: 'holder', holderId: 'u 1', show: 'overdue', projectId: 'p9', sectionId: 's3' });
  });

  it('defaults to all active tasks and keeps the plain address short', () => {
    expect(href.holder('u1')).toBe('#/holders/u1');
    expect(href.holder('u1', { show: 'active' })).toBe('#/holders/u1');
    expect(parseHash('#/holders/u1')).toEqual({ name: 'holder', holderId: 'u1', show: 'active', projectId: null, sectionId: null });
  });

  it('ignores an unknown view instead of breaking the page', () => {
    expect(parseHash('#/holders/u1?show=nonsense')).toMatchObject({ name: 'holder', show: 'active' });
  });
});

describe('project addresses', () => {
  it('round-trips the board layout, so a shared link opens the board', () => {
    const url = href.project('p 7', { board: true });
    expect(url).toBe('#/projects/p%207?view=board');
    expect(parseHash(url)).toEqual({ name: 'project', projectId: 'p 7', sectionId: null, taskId: null, show: null, board: true });
  });

  it('keeps the board while a KPI card narrows the project', () => {
    expect(parseHash(href.project('p7', { show: 'no-dd', board: true }))).toMatchObject({ show: 'no-dd', board: true });
  });

  it('is the list unless the board was asked for', () => {
    expect(href.project('p7')).toBe('#/projects/p7');
    expect(parseHash('#/projects/p7')).toMatchObject({ board: false });
    expect(parseHash('#/projects/p7?view=nonsense')).toMatchObject({ board: false });
  });
});
