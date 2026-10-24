import { describe, expect, it } from 'vitest';

import {
  dedupeChannels,
  getChannelAttr,
  getChannelName,
  isStreamUrl,
  m3uToPlaylist,
  txtToPlaylist,
  playlistToM3u,
  playlistToTxt,
} from '../src/playlist';

describe('m3uToPlaylist', () => {
  it('keeps the #EXTM3U header and EXTINF + URL pairs', () => {
    const raw = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="cctv1" group-title="央视",CCTV-1',
      'https://example.com/cctv1',
      '',
      '#EXTINF:-1,Other',
      'http://example.com/other',
    ].join('\n');

    expect(m3uToPlaylist(raw)).toEqual({
      header: '#EXTM3U',
      channels: [
        {
          extinf: '#EXTINF:-1 tvg-id="cctv1" group-title="央视",CCTV-1',
          url: 'https://example.com/cctv1',
        },
        { extinf: '#EXTINF:-1,Other', url: 'http://example.com/other' },
      ],
    });
  });

  it('removes \\r and empty lines', () => {
    expect(m3uToPlaylist('#EXTM3U\r\n\r\n#EXTINF:-1,A\r\nhttp://a.com')).toEqual({
      header: '#EXTM3U',
      channels: [{ extinf: '#EXTINF:-1,A', url: 'http://a.com' }],
    });
  });

  it('drops commented-out channels', () => {
    const raw = [
      '#EXTM3U',
      '##EXTINF:-1,Commented A',
      '#http://example.com/a',
      '# #EXTINF:-1,Commented B',
      'http://example.com/b',
      '  #EXTINF:-1,Indented C',
      '  rtp://239.3.1.1:8000',
    ].join('\n');

    expect(m3uToPlaylist(raw).channels).toEqual([
      { extinf: '#EXTINF:-1,Indented C', url: 'rtp://239.3.1.1:8000' },
    ]);
  });

  it('drops channels whose next line is not a stream url', () => {
    const raw = ['#EXTM3U', '#EXTINF:-1,A', '#EXTVLCOPT:x', 'http://a.com'].join('\n');
    expect(m3uToPlaylist(raw).channels).toEqual([]);
  });

  it('leaves the header undefined when missing', () => {
    expect(m3uToPlaylist('#EXTINF:-1,A\nhttp://a.com').header).toBeUndefined();
  });
});

describe('txtToPlaylist', () => {
  it('uses #genre# lines as groups and skips empty urls', () => {
    const raw = ['央视,#genre#', 'CCTV1,rtp://239.3.1.129:8008', 'CCTV2,', '无分组'].join('\n');
    const { header, channels } = txtToPlaylist(raw);

    expect(header).toBe('#EXTM3U x-tvg-url="https://tv.whyun.com/epg/51zmt.xml"');
    expect(channels).toEqual([
      {
        extinf:
          '#EXTINF:-1 tvg-id="CCTV1" tvg-name="CCTV1" tvg-logo="https://tv-res.pages.dev/logo/cctv1.png" group-title="央视",CCTV1',
        url: 'rtp://239.3.1.129:8008',
      },
    ]);
  });

  it('defaults to the 未分类 group', () => {
    expect(txtToPlaylist('A,http://a.com').channels[0].extinf).toContain('group-title="未分类",A');
  });
});

describe('playlistToM3u', () => {
  it('round-trips a parsed playlist', () => {
    const raw = ['#EXTM3U', '#EXTINF:-1,A', 'http://a.com', '#EXTINF:-1,B', 'http://b.com'].join(
      '\n'
    );
    expect(playlistToM3u(m3uToPlaylist(raw))).toBe(raw);
  });

  it('omits a missing header', () => {
    expect(playlistToM3u({ channels: [{ extinf: '#EXTINF:-1,A', url: 'http://a.com' }] })).toBe(
      '#EXTINF:-1,A\nhttp://a.com'
    );
  });
});

describe('playlistToTxt', () => {
  it('groups channels by group-title', () => {
    const playlist = m3uToPlaylist(
      [
        '#EXTM3U',
        '#EXTINF:-1 tvg-id="cctv1" group-title="央视",CCTV-1 综合',
        'https://example.com/cctv1',
        '#EXTINF:-1 tvg-id="btv1" group-title="北京",北京卫视',
        'https://example.com/btv1',
        '#EXTINF:-1 tvg-id="cctv2" group-title="央视",CCTV-2 财经',
        'https://example.com/cctv2',
      ].join('\n')
    );

    expect(playlistToTxt(playlist)).toBe(
      [
        '央视,#genre#',
        'CCTV-1_综合,https://example.com/cctv1',
        'CCTV-2_财经,https://example.com/cctv2',
        '',
        '北京,#genre#',
        '北京卫视,https://example.com/btv1',
      ].join('\n')
    );
  });

  it('uses the default group when there is no group-title', () => {
    expect(
      playlistToTxt({ channels: [{ extinf: '#EXTINF:-1,Custom Channel', url: 'https://c.com' }] })
    ).toBe('未分类,#genre#\nCustom_Channel,https://c.com');
  });
});

describe('channel helpers', () => {
  it('reads the channel name and attributes', () => {
    const extinf = '#EXTINF:-1 tvg-name="A" group-title="G",Name, with comma';
    expect(getChannelName(extinf)).toBe('Name, with comma');
    expect(getChannelAttr(extinf, 'group-title')).toBe('G');
    expect(getChannelAttr(extinf, 'tvg-logo')).toBeUndefined();
  });

  it('checks stream urls', () => {
    expect(isStreamUrl('rtp://239.0.0.1:1234')).toBe(true);
    expect(isStreamUrl('example.com/live')).toBe(false);
    expect(isStreamUrl(undefined)).toBe(false);
  });

  it('dedupes channels by key, keeping the first one', () => {
    const channels = [
      { extinf: '#EXTINF:-1,A', url: 'http://1' },
      { extinf: '#EXTINF:-1,A', url: 'http://2' },
      { extinf: '#EXTINF:-1,B', url: 'http://3' },
    ];
    expect(dedupeChannels(channels, ({ extinf }) => extinf).map(({ url }) => url)).toEqual([
      'http://1',
      'http://3',
    ]);
  });
});
