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

describe('project board columns', () => {
  it('round-trips the assignee-wise board', () => {
    const url = href.project('p7', { by: 'assignee' });
    expect(url).toBe('#/projects/p7?by=assignee');
    expect(parseHash(url)).toMatchObject({ name: 'project', projectId: 'p7', by: 'assignee' });
  });

  it('keeps the assignee columns while a KPI card narrows the project', () => {
    expect(parseHash(href.project('p7', { show: 'no-dd', by: 'assignee' }))).toMatchObject({ show: 'no-dd', by: 'assignee' });
  });

  it('stands for sections unless the people were asked for', () => {
    expect(href.project('p7', { by: 'section' })).toBe('#/projects/p7');
    expect(parseHash('#/projects/p7')).toMatchObject({ by: 'section' });
    expect(parseHash('#/projects/p7?by=nonsense')).toMatchObject({ by: 'section' });
  });
});
