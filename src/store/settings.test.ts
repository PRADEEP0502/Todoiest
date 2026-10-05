import { describe, expect, it } from 'vitest';
import { resolveSettings } from './settings';

describe('how tasks are laid out', () => {
  it('is a list until the board is chosen', () => {
    expect(resolveSettings({}, '').taskLayout).toBe('list');
    expect(resolveSettings({ taskLayout: 'list' }, '').taskLayout).toBe('list');
  });

  it('keeps the board once it has been chosen', () => {
    expect(resolveSettings({ taskLayout: 'board' }, '').taskLayout).toBe('board');
  });

  it('ignores anything else stored in its place', () => {
    expect(resolveSettings({ taskLayout: 'kanban' as never }, '').taskLayout).toBe('list');
  });
});
