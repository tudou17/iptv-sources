import { describe, expect, it } from 'vitest';

import { collectSourceUrls } from '../../src/pipeline/sources';
import type { ISource, ISourceOutput } from '../../src/sources';

const source: ISource = { name: 'test', filename: 'test', url: '' };

const output = (filename: string, urls: string[]): ISourceOutput => ({
  filename,
  playlist: {
    header: '#EXTM3U',
    channels: urls.map((url) => ({ extinf: '#EXTINF:-1,CCTV1', url })),
  },
});

describe('collectSourceUrls', () => {
  it('collects urls of every output by channel id, skipping urls without a scheme', () => {
    const collected = collectSourceUrls(source, [
      output('a', ['http://a/1', 'not-a-url']),
      output('b', ['http://b/1', 'http://a/1']),
    ]);

    expect([...collected]).toEqual([['cctv1', ['http://a/1', 'http://b/1']]]);
  });

  it('prefers candidates over the written channels', () => {
    const collected = collectSourceUrls(source, [
      {
        ...output('a', ['http://a/1']),
        candidates: [
          { extinf: '#EXTINF:-1,CCTV1', url: 'http://a/1' },
          { extinf: '#EXTINF:-1,CCTV1', url: 'http://a/2' },
        ],
      },
    ]);

    expect(collected.get('cctv1')).toEqual(['http://a/1', 'http://a/2']);
  });

  it('collects nothing when collectSources is false', () => {
    const collected = collectSourceUrls({ ...source, collectSources: false }, [
      output('a', ['http://a/1']),
    ]);

    expect(collected.size).toBe(0);
  });
});
