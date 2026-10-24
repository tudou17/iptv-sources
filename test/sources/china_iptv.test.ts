import { describe, expect, it } from 'vitest';

import { txtToPlaylist, playlistToM3u } from '../../src/playlist';
import {
  chinaIptvSources,
  chinaIptvTransform,
  parseChinaIptvFileName,
} from '../../src/sources/china_iptv';
import { LAN_IP_PREFIXES } from '../../src/sources/lan_proxy';

const raw = [
  '央视,#genre#',
  'CCTV1,rtp://239.3.1.129:8008',
  'CCTV2,',
  '卫视,#genre#',
  '北京卫视,udp://239.3.1.241:8000',
  '外网,http://example.com/live.m3u8',
].join('\n');

const transform = (filename: string) => chinaIptvTransform!(txtToPlaylist(raw), filename);

describe('chinaIptvTransform', () => {
  it('converts genre txt to m3u and skips empty urls', () => {
    const [result] = transform('iptv/unicast/hebei/unicom');
    const m3u = playlistToM3u(result.playlist);

    expect(result.filename).toBe('iptv/unicast/hebei/unicom');
    expect(result.playlist.channels).toHaveLength(3);
    expect(m3u).toContain('group-title="央视",CCTV1\nrtp://239.3.1.129:8008');
    expect(m3u).toContain('group-title="卫视",北京卫视');
    expect(m3u).not.toContain('CCTV2');
  });

  it('creates only the raw result for unicast sources', () => {
    expect(transform('iptv/unicast/hebei/unicom')).toHaveLength(1);
  });

  it('creates one LAN proxy result per gateway for multicast sources', () => {
    const results = transform('iptv/multicast/hebei/unicom');

    expect(LAN_IP_PREFIXES).toHaveLength(13);
    expect(results).toHaveLength(1 + 13);
    expect(results.map(({ filename }) => filename)).toEqual([
      'iptv/multicast/hebei/unicom',
      ...LAN_IP_PREFIXES.map((p) => `iptv/multicast/hebei/unicom_${p.replace(/\./g, '_')}`),
    ]);
    expect(results[0].lanProxy).toBeUndefined();

    const proxied = results.find(({ filename }) => filename.endsWith('_192_168_1'));
    const m3u = playlistToM3u(proxied!.playlist);
    expect(proxied?.lanProxy).toEqual({
      ipPrefix: '192.168.1',
      baseFilename: 'iptv/multicast/hebei/unicom',
    });
    expect(m3u).toContain('http://192.168.1.1:23234/rtp/239.3.1.129:8008');
    expect(m3u).toContain('http://192.168.1.1:23234/udp/239.3.1.241:8000');
    expect(m3u).toContain('http://example.com/live.m3u8');
    expect(proxied?.playlist.channels).toHaveLength(3);
  });
});

describe('parseChinaIptvFileName', () => {
  it('parses iptv file names', () => {
    expect(parseChinaIptvFileName('iptv/multicast/guangdong/broadent')).toEqual({
      type: 'multicast',
      province: 'guangdong',
      operator: 'broadent',
    });
    expect(parseChinaIptvFileName('iptv/multicast/beijing/unicom_192_168_1')).toBeUndefined();
    expect(parseChinaIptvFileName('q_bj_iptv_unicom_m')).toBeUndefined();
  });
});

describe('chinaIptvSources', () => {
  it('lists every upstream file', () => {
    expect(chinaIptvSources).toHaveLength(189);
    expect(new Set(chinaIptvSources.map(({ filename }) => filename)).size).toBe(189);
    expect(chinaIptvSources).toContainEqual(
      expect.objectContaining({
        name: 'CHINA-IPTV 北京 联通 组播',
        filename: 'iptv/multicast/beijing/unicom',
        url: 'https://raw.githubusercontent.com/xisohi/CHINA-IPTV/main/Multicast/beijing/unicom.txt',
      })
    );
    expect(chinaIptvSources.filter(({ filename }) => filename.endsWith('/broadent'))).toHaveLength(
      3
    );
  });
});
