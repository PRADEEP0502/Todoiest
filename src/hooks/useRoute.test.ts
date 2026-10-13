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

describe('one holder inside a project', () => {
  it('round-trips a person, this account, and the unheld tasks', () => {
    expect(href.project('p7', { holder: 'u9' })).toBe('#/projects/p7?holder=u9');
    expect(parseHash(href.project('p7', { holder: 'u9' }))).toMatchObject({ name: 'project', holder: 'u9' });
    expect(parseHash(href.project('p7', { holder: 'me' }))).toMatchObject({ holder: 'me' });
    expect(parseHash(href.project('p7', { holder: 'none' }))).toMatchObject({ holder: 'none' });
  });

  it('keeps the filter beside a KPI card and the assignee board', () => {
    expect(parseHash(href.project('p7', { show: 'no-dd', by: 'assignee', holder: 'me' }))).toMatchObject({
      show: 'no-dd',
      by: 'assignee',
      holder: 'me',
    });
  });

  it('is everyone when nobody was picked', () => {
    expect(href.project('p7')).toBe('#/projects/p7');
    expect(parseHash('#/projects/p7')).toMatchObject({ holder: null });
  });
});
