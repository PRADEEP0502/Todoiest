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
