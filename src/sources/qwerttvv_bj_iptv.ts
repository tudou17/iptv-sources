import { expandLanProxyOutputs, getLanProxyOrigin } from './lan_proxy';
import type { ISource, TSources } from './utils';

// 上游非组播源中的地址已经是 http://192.168.123.1:23234/rtp/... 形式，这里连同 host 一起替换
const replaceWithLanProxyUrl = (url: string, lanIpPrefix: string) => {
  const proxyOrigin = getLanProxyOrigin(lanIpPrefix);

  if (url.startsWith('rtp://')) {
    return `${proxyOrigin}/rtp/${url.slice('rtp://'.length)}`;
  }

  return url.replace(/^https?:\/\/[^/]+/, proxyOrigin);
};

/** 只输出各网段的代理版本，放在 bj_iptv/ 目录下 */
export const qwerttvvBjIptvTransform: ISource['transform'] = (playlist, filename) =>
  expandLanProxyOutputs(playlist, `bj_iptv/${filename}`, replaceWithLanProxyUrl);

export const qwerttvvBjIptvSources: TSources = [
  {
    name: 'qwerttvv/Beijing-IPTV IPTV Unicom',
    filename: 'q_bj_iptv_unicom',
    url: 'https://raw.githubusercontent.com/qwerttvv/Beijing-IPTV/master/IPTV-Unicom.m3u',
    transform: qwerttvvBjIptvTransform,
  },
  {
    name: 'qwerttvv/Beijing-IPTV IPTV Unicom Multicast',
    filename: 'q_bj_iptv_unicom_m',
    url: 'https://raw.githubusercontent.com/qwerttvv/Beijing-IPTV/master/IPTV-Unicom-Multicast.m3u',
  },
  {
    name: 'qwerttvv/Beijing-IPTV IPTV Mobile',
    filename: 'q_bj_iptv_mobile',
    url: 'https://raw.githubusercontent.com/qwerttvv/Beijing-IPTV/master/IPTV-Mobile.m3u',
    transform: qwerttvvBjIptvTransform,
  },
  {
    name: 'qwerttvv/Beijing-IPTV IPTV Mobile Multicast',
    filename: 'q_bj_iptv_mobile_m',
    url: 'https://raw.githubusercontent.com/qwerttvv/Beijing-IPTV/master/IPTV-Mobile-Multicast.m3u',
  },
];
