import { describe, expect, it } from 'vitest';

import { txtToPlaylist } from '../../src/playlist';
import { buildSourceOutputs, type ISource } from '../../src/sources/utils';

const m3u = ['#EXTM3U', '#EXTINF:-1,Channel A', 'https://a.com'].join('\n');

describe('buildSourceOutputs', () => {
  it('parses m3u, normalizes it and emits one output named filename by default', () => {
    const source: ISource = { name: 'test', filename: 'test_m3u', url: '' };

    expect(buildSourceOutputs(source, m3u)).toEqual([
      {
        filename: 'test_m3u',
        playlist: {
          header: '#EXTM3U',
          channels: [
            {
              extinf:
                '#EXTINF:-1 tvg-name="Channel A" tvg-logo="https://tv-res.pages.dev/logo/Channel%20A.png" group-title="未分类",Channel A',
              url: 'https://a.com',
            },
          ],
        },
      },
    ]);
  });

  it('keeps the upstream lines when normalize is false', () => {
    const source: ISource = { name: 'test', filename: 'test_m3u', url: '', normalize: false };

    expect(buildSourceOutputs(source, m3u)[0].playlist.channels).toEqual([
      { extinf: '#EXTINF:-1,Channel A', url: 'https://a.com' },
    ]);
  });

  it('uses the source parser and transform', () => {
    const source: ISource = {
      name: 'test',
      filename: 'test_txt',
      url: '',
      parse: txtToPlaylist,
      transform: (playlist, filename) => [
        { filename: `${filename}_a`, playlist },
        { filename: `${filename}_b`, playlist },
      ],
    };
    const outputs = buildSourceOutputs(source, '央视,#genre#\nCCTV1,https://cctv1.com');

    expect(outputs.map(({ filename }) => filename)).toEqual(['test_txt_a', 'test_txt_b']);
    expect(outputs[0].playlist.channels[0].extinf).toContain(
      'tvg-logo="https://tv-res.pages.dev/logo/cctv1.png"'
    );
  });
});
