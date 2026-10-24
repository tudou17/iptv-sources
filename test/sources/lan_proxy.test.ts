import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_IPTV_PROXY_IP_RANGES,
  getLanProxyFilename,
  parseIptvProxyIpRanges,
  replaceWithLanProxyUrl,
} from '../../src/sources/lan_proxy';

describe('replaceWithLanProxyUrl', () => {
  it('only rewrites rtp and udp urls', () => {
    expect(replaceWithLanProxyUrl('rtp://239.0.0.1:1234', '10.0.0')).toBe(
      'http://10.0.0.1:23234/rtp/239.0.0.1:1234'
    );
    expect(replaceWithLanProxyUrl('rtsp://1.2.3.4/live', '10.0.0')).toBe('rtsp://1.2.3.4/live');
  });

  it('uses the given proxy port', () => {
    expect(replaceWithLanProxyUrl('rtp://239.0.0.1:1234', '10.0.0', 4022)).toBe(
      'http://10.0.0.1:4022/rtp/239.0.0.1:1234'
    );
  });
});

describe('getLanProxyFilename', () => {
  it('appends the ip prefix with underscores', () => {
    expect(getLanProxyFilename('bj_iptv/q', '192.168.1')).toBe('bj_iptv/q_192_168_1');
  });
});

describe('parseIptvProxyIpRanges', () => {
  it('expands ranges in any octet and removes duplicates', () => {
    expect(parseIptvProxyIpRanges(' 192.168.1-3 , 10.0-1.0, 192.168.2 ')).toEqual([
      '192.168.1',
      '192.168.2',
      '192.168.3',
      '10.0.0',
      '10.1.0',
    ]);
  });

  it('parses the default ranges into 13 prefixes', () => {
    expect(parseIptvProxyIpRanges(DEFAULT_IPTV_PROXY_IP_RANGES)).toHaveLength(13);
  });

  it.each(['', '192.168', '192.168.1.1', '192.168.10-1', '192.168.256', '192.168.a'])(
    'rejects invalid value %j',
    (value) => {
      expect(parseIptvProxyIpRanges(value)).toBeUndefined();
    }
  );
});

describe('IPTV proxy environment variables', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async () => {
    vi.resetModules();
    return import('../../src/sources/lan_proxy');
  };

  it('uses defaults when not provided', async () => {
    vi.stubEnv('IPTV_PROXY_IP_RANGES', '');
    vi.stubEnv('IPTV_PROXY_PORT', '');
    const mod = await load();

    expect(mod.LAN_IP_PREFIXES).toHaveLength(13);
    expect(mod.IPTV_PROXY_PORT).toBe(23234);
  });

  it('reads custom ranges and port', async () => {
    vi.stubEnv('IPTV_PROXY_IP_RANGES', '172.16.0-1');
    vi.stubEnv('IPTV_PROXY_PORT', '4022');
    const mod = await load();

    expect(mod.LAN_IP_PREFIXES).toEqual(['172.16.0', '172.16.1']);
    expect(mod.IPTV_PROXY_PORT).toBe(4022);
    expect(mod.replaceWithLanProxyUrl('rtp://239.0.0.1:1234', '172.16.0')).toBe(
      'http://172.16.0.1:4022/rtp/239.0.0.1:1234'
    );
  });

  it('falls back to defaults on invalid values', async () => {
    vi.stubEnv('IPTV_PROXY_IP_RANGES', '192.168');
    vi.stubEnv('IPTV_PROXY_PORT', '70000');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await load();

    expect(mod.LAN_IP_PREFIXES).toHaveLength(13);
    expect(mod.IPTV_PROXY_PORT).toBe(23234);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
