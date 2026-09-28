import { resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileFor } from './index';

const ROOT = resolve('/srv/app/dist');

describe('which file a request may read', () => {
  it('serves files inside the built site', () => {
    expect(fileFor(ROOT, '/index.html')).toBe(`${ROOT}${sep}index.html`);
    expect(fileFor(ROOT, '/assets/app-1a2b.js')).toBe(`${ROOT}${sep}assets${sep}app-1a2b.js`);
    expect(fileFor(ROOT, '/assets/app.js?v=2')).toBe(`${ROOT}${sep}assets${sep}app.js`);
    // A name with a space arrives encoded.
    expect(fileFor(ROOT, '/my%20icon.png')).toBe(`${ROOT}${sep}my icon.png`);
  });

  it('refuses anything that climbs out of it', () => {
    for (const path of ['/../package.json', '/%2e%2e/package.json', '/assets/../../.env', '/..%2f..%2fetc%2fpasswd', '/%00/etc/passwd']) {
      expect(fileFor(ROOT, path), path).toBeNull();
    }
  });

  it('refuses a path that cannot be decoded', () => {
    expect(fileFor(ROOT, '/%E0%A4%A')).toBeNull();
  });
});
