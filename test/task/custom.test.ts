import { describe, expect, it } from 'vitest';

import type { IPlaylist } from '../../src/playlist';
import { applyCustomRules } from '../../src/task/custom';

const playlist: IPlaylist = {
  header: '#EXTM3U',
  channels: [
    { extinf: '#EXTINF:-1 group-title="央视",CCTV1', url: 'http://a.com/cctv1' },
    { extinf: '#EXTINF:-1 group-title="央视",CCTV2 ', url: 'http://a.com/cctv2' },
    { extinf: '#EXTINF:-1 group-title="卫视",北京卫视', url: 'http://b.com/btv' },
  ],
};

const urlsOf = ({ channels }: IPlaylist) => channels.map(({ url }) => url);

describe('applyCustomRules', () => {
  it('keeps every channel without include / exclude', () => {
    expect(applyCustomRules(playlist, [{ upstream: 'x' }])).toEqual(playlist);
  });

  it('prefers include over exclude and matches trimmed names', () => {
    const result = applyCustomRules(playlist, [
      { upstream: 'x', include: ['CCTV2'], exclude: ['CCTV2'] },
    ]);
    expect(urlsOf(result)).toEqual(['http://a.com/cctv2']);
  });

  it('drops excluded channels', () => {
    const result = applyCustomRules(playlist, [{ upstream: 'x', exclude: ['CCTV1'] }]);
    expect(urlsOf(result)).toEqual(['http://a.com/cctv2', 'http://b.com/btv']);
  });

  it('applies only the first matching replacer', () => {
    const result = applyCustomRules(playlist, [
      {
        upstream: 'x',
        include: ['CCTV1', '北京卫视'],
        replacer: {
          url: [
            { type: 'string', pattern: 'a.com', target: 'proxy.com' },
            { type: 'regexp', pattern: '\\w+\\.com', flags: 'g', target: 'never.com' },
          ],
          extinf: [{ type: 'regexp', pattern: '央视', flags: 'g', target: 'CCTV' }],
        },
      },
    ]);

    expect(result.channels).toEqual([
      { extinf: '#EXTINF:-1 group-title="CCTV",CCTV1', url: 'http://proxy.com/cctv1' },
      { extinf: '#EXTINF:-1 group-title="卫视",北京卫视', url: 'http://never.com/btv' },
    ]);
  });

  it('ignores replacers with an empty target', () => {
    const result = applyCustomRules(playlist, [
      {
        upstream: 'x',
        include: ['CCTV1'],
        replacer: { url: [{ type: 'string', pattern: 'a.com', target: '' }] },
      },
    ]);
    expect(urlsOf(result)).toEqual(['http://a.com/cctv1']);
  });

  it('appends channels after each rule and concatenates rules', () => {
    const result = applyCustomRules(playlist, [
      {
        upstream: 'x',
        include: ['CCTV1'],
        append: [
          { name: ' My TV ', url: 'http://my.tv' },
          { name: 'ignored', extinf: '#EXTINF:-1,Raw', url: 'http://raw.tv' },
        ],
      },
      { upstream: 'x', include: ['北京卫视'] },
    ]);

    expect(result.channels).toEqual([
      { extinf: '#EXTINF:-1 group-title="央视",CCTV1', url: 'http://a.com/cctv1' },
      {
        extinf:
          '#EXTINF:-1 tvg-id="My TV" tvg-name="My TV" tvg-logo="https://tv-res.pages.dev/logo/My%20TV.png" group-title="Custom",My TV',
        url: 'http://my.tv',
      },
      { extinf: '#EXTINF:-1,Raw', url: 'http://raw.tv' },
      { extinf: '#EXTINF:-1 group-title="卫视",北京卫视', url: 'http://b.com/btv' },
    ]);
  });
});
