import { afterEach, describe, expect, it, vi } from 'vitest';

import { m3uToPlaylist, playlistToM3u } from '../../src/playlist';
import { LAN_IP_PREFIXES } from '../../src/sources/lan_proxy';
import { qwerttvvBjIptvSources, qwerttvvBjIptvTransform } from '../../src/sources/qwerttvv_bj_iptv';
import { buildSourceOutputs } from '../../src/sources/utils';

const raw = [
  '#EXTM3U',
  '#EXTINF:-1,HTTP Channel',
  'http://192.168.123.1:23234/rtp/239.3.1.118:8001',
  '#EXTINF:-1,RTP Channel',
  'rtp://239.3.1.159:8000',
].join('\n');

describe('qwerttvvBjIptvTransform', () => {
  it('creates one result for every supported LAN IP prefix', () => {
    const results = qwerttvvBjIptvTransform!(m3uToPlaylist(raw), 'q_bj_iptv');

    expect(LAN_IP_PREFIXES).toHaveLength(13);
    expect(results).toHaveLength(13);
    expect(results.map(({ filename }) => filename)).toEqual(
      LAN_IP_PREFIXES.map((p) => `bj_iptv/q_bj_iptv_${p.replace(/\./g, '_')}`)
    );
    expect(results[0].filename).toBe('bj_iptv/q_bj_iptv_192_168_0');
    expect(results[12].filename).toBe('bj_iptv/q_bj_iptv_10_0_0');
    expect(results[0].lanProxy?.baseFilename).toBe('bj_iptv/q_bj_iptv');
  });

  it('rewrites HTTP and RTP channel URLs to each LAN gateway', () => {
    const results = qwerttvvBjIptvTransform!(m3uToPlaylist(raw), 'q_bj_iptv');
    const result = results.find(({ filename }) => filename === 'bj_iptv/q_bj_iptv_192_168_6');
    const m3u = playlistToM3u(result!.playlist);

    expect(m3u).toContain('http://192.168.6.1:23234/rtp/239.3.1.118:8001');
    expect(m3u).toContain('http://192.168.6.1:23234/rtp/239.3.1.159:8000');
    expect(m3u).not.toContain('192.168.123.1');
    expect(result?.playlist.channels).toHaveLength(2);
  });
});

describe('qwerttvv_bj_iptv multicast sources', () => {
  it.each(['q_bj_iptv_unicom_m', 'q_bj_iptv_mobile_m'])(
    'preserves channel URLs and emits one playlist for %s',
    (expected) => {
      const source = qwerttvvBjIptvSources.find(({ filename }) => filename === expected);
      expect(source).toBeDefined();

      const outputs = buildSourceOutputs(source!, raw);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].filename).toBe(expected);
      expect(outputs[0].playlist.channels.map(({ url }) => url)).toEqual(
        m3uToPlaylist(raw).channels.map(({ url }) => url)
      );
    }
  );
});

describe('qwerttvv_bj_iptv proxy environment variables', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('follows IPTV_PROXY_IP_RANGES and IPTV_PROXY_PORT', async () => {
    vi.stubEnv('IPTV_PROXY_IP_RANGES', '172.16.0-1');
    vi.stubEnv('IPTV_PROXY_PORT', '4022');
    vi.resetModules();
    const mod = await import('../../src/sources/qwerttvv_bj_iptv');

    const results = mod.qwerttvvBjIptvTransform!(m3uToPlaylist(raw), 'q_bj_iptv');

    expect(results.map(({ filename }) => filename)).toEqual([
      'bj_iptv/q_bj_iptv_172_16_0',
      'bj_iptv/q_bj_iptv_172_16_1',
    ]);
    const m3u = playlistToM3u(results[1].playlist);
    expect(m3u).toContain('http://172.16.1.1:4022/rtp/239.3.1.118:8001');
    expect(m3u).toContain('http://172.16.1.1:4022/rtp/239.3.1.159:8000');
  });
});
