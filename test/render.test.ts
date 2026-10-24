import { describe, expect, it } from 'vitest';

import type { ISourceBuildResult, ISourceOutputSummary } from '../src/pipeline/sources';
import {
  renderChannelList,
  renderIptvRegionPage,
  renderLanIpList,
  renderSourceRows,
} from '../src/render';

const result = (name: string, outputs: ISourceOutputSummary[]): ISourceBuildResult => ({
  source: { name, filename: outputs[0]?.filename ?? '', url: '' },
  outputs,
});

const lanOutput = (
  baseFilename: string,
  ipPrefix: string,
  channelCount: number | undefined = 10
): ISourceOutputSummary => ({
  filename: `${baseFilename}_${ipPrefix.replace(/\./g, '_')}`,
  channelCount,
  lanProxy: { ipPrefix, baseFilename },
});

describe('renderSourceRows', () => {
  it('renders only the first output when a source has multiple outputs', () => {
    const markdown = renderSourceRows([
      result('Multi source', [
        lanOutput('multi', '192.168.0', 10),
        lanOutput('multi', '192.168.1', 20),
      ]),
      result('Single source', [{ filename: 'single', channelCount: 30 }]),
      result('Failed source', [{ filename: 'failed', channelCount: undefined }]),
    ]);

    expect(markdown).toContain('multi_192_168_0.m3u');
    expect(markdown).not.toContain('multi_192_168_1.m3u');
    expect(markdown).toContain('| 10 |');
    expect(markdown).toContain(
      '| Single source | [single.m3u](/single.m3u) <br> [single.txt](/txt/single.txt) | [List for Single source](/list/single.list) | 30 |'
    );
    expect(markdown).toContain('| update failed |');
  });

  it('adds a more link for LAN outputs', () => {
    const markdown = renderSourceRows([
      result('LAN source', [
        { filename: 'lan', channelCount: 10 },
        lanOutput('lan', '192.168.0'),
        lanOutput('lan', '10.0.0'),
      ]),
    ]);

    expect(markdown).toContain('**[局域网 IP 列表](/list/lan.more.list)**');
  });

  it('skips CHINA-IPTV sources in the channel table', () => {
    const markdown = renderSourceRows([
      result('CHINA-IPTV 北京 联通 单播', [
        { filename: 'iptv/unicast/beijing/unicom', channelCount: 10 },
      ]),
      result('Single source', [{ filename: 'single', channelCount: 20 }]),
    ]);

    expect(markdown).not.toContain('iptv/');
    expect(markdown).toContain('single.m3u');
  });

  it('ignores a result without outputs', () => {
    expect(renderSourceRows([result('Empty', [])])).toBe('');
  });
});

describe('renderLanIpList', () => {
  it('renders LAN IP links to their individual source lists', () => {
    const markdown = renderLanIpList(
      result('CHINA-IPTV 北京 联通 组播', [
        { filename: 'iptv/multicast/beijing/unicom', channelCount: 10 },
        lanOutput('iptv/multicast/beijing/unicom', '192.168.0'),
        lanOutput('iptv/multicast/beijing/unicom', '10.0.0'),
      ])
    );

    expect(markdown).toContain('# LAN IPs for **CHINA-IPTV 北京 联通 组播**');
    expect(markdown).toContain('[192.168.0.1](/list/iptv/multicast/beijing/unicom_192_168_0.list)');
    expect(markdown).toContain('[10.0.0.1](/list/iptv/multicast/beijing/unicom_10_0_0.list)');
    expect(markdown).not.toContain('(/list/iptv/multicast/beijing/unicom.list)');
  });
});

describe('renderChannelList', () => {
  it('fills the template with channel rows', () => {
    const markdown = renderChannelList(
      '<!-- list_title_here -->\n<!-- channels_here -->',
      'Source',
      'dir/file',
      [
        { extinf: '#EXTINF:-1,A|B ', url: 'http://1.2.3.4/live' },
        { extinf: '#EXTINF:-1,Bad', url: 'not-a-url' },
      ]
    );

    expect(markdown).toContain('# List for **Source**');
    expect(markdown).toContain(
      '> M3U: [dir/file.m3u](/dir/file.m3u), TXT: [dir/file.txt](/txt/dir/file.txt)'
    );
    expect(markdown).toContain('| 1 | AB | IPv4 直链 | <http://1.2.3.4/live> |');
    expect(markdown).not.toContain('Bad');
  });
});

describe('renderIptvRegionPage', () => {
  const markdown = renderIptvRegionPage([
    result('CHINA-IPTV 北京 联通 组播', [
      { filename: 'iptv/multicast/beijing/unicom', channelCount: 86 },
      lanOutput('iptv/multicast/beijing/unicom', '192.168.0', 86),
    ]),
    result('CHINA-IPTV 广东 广电 组播', [
      { filename: 'iptv/multicast/guangdong/broadent', channelCount: undefined },
    ]),
    result('CHINA-IPTV 北京 移动 单播', [
      { filename: 'iptv/unicast/beijing/mobile', channelCount: 120 },
    ]),
    result('Single source', [{ filename: 'single', channelCount: 5 }]),
  ]);
  const [multicast, unicast] = markdown.split('## 🔗单播');

  it('renders multicast cells with proxy links', () => {
    expect(multicast).toContain('## 🛰️组播');
    expect(multicast).toContain(
      '| 地区 | <img src="https://chinaiptv.pages.dev/logo/unicom.png" alt="联通" height="24"> 联通 | <img src="https://chinaiptv.pages.dev/logo/broadent.png" alt="广电" height="24"> 广电 |'
    );
    expect(multicast).toContain(
      '| 北京 | [📺m3u](/iptv/multicast/beijing/unicom.m3u) [📄txt](/txt/iptv/multicast/beijing/unicom.txt) [📋列表](/list/iptv/multicast/beijing/unicom.list) [🏠代理](/list/iptv/multicast/beijing/unicom.more.list) <br> 🛰️86 个频道 | 🌐暂无 |'
    );
    expect(multicast).toContain('| 广东 | 🌐暂无 | ⚠️更新失败 |');
  });

  it('renders unicast cells without proxy links', () => {
    expect(unicast).toContain('alt="移动" height="24"> 移动 |');
    expect(unicast).toContain(
      '[📋列表](/list/iptv/unicast/beijing/mobile.list) <br> 🔗120 个频道 |'
    );
    expect(unicast).not.toContain('代理');
  });

  it('ignores non CHINA-IPTV sources', () => {
    expect(markdown).not.toContain('single');
  });

  it('describes the configured gateways and proxy port', () => {
    expect(markdown).toContain('192.168.0.1、192.168.1.1');
    expect(markdown).toContain('`http://<网关>:23234/rtp/...`');

    const custom = renderIptvRegionPage([], {
      lanIpPrefixes: ['172.16.0', '172.16.1'],
      proxyPort: 4022,
    });
    expect(custom).toContain('以下网关（172.16.0.1、172.16.1.1）');
    expect(custom).toContain('`http://<网关>:4022/rtp/...`');

    const many = renderIptvRegionPage([], {
      lanIpPrefixes: Array.from({ length: 20 }, (_, i) => `192.168.${i}`),
    });
    expect(many).toContain('以下网关（共 20 个网关）');
  });
});
