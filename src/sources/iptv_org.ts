import { dedupeChannels } from '../playlist';
import { getChannelId, isFilteredChannel } from '../utils';
import type { ISource, TSources } from './utils';

/** 过滤屏蔽频道，按频道 id 去重 */
export const iptvOrgTransform: ISource['transform'] = ({ header, channels }, filename) => {
  const candidates = channels.filter(
    ({ extinf }) => !isFilteredChannel(getChannelId(extinf).trim())
  );
  const deduped = dedupeChannels(candidates, ({ extinf }) => getChannelId(extinf));

  return [
    {
      filename,
      playlist: { header, channels: deduped },
      candidates,
    },
  ];
};

export const iptvOrgSources: TSources = [
  {
    name: 'iptv.org All',
    filename: 'o_all',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/gh-pages/index.m3u',
    transform: iptvOrgTransform,
    collectSources: false,
  },
  {
    name: 'iptv.org China',
    filename: 'o_cn',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/gh-pages/countries/cn.m3u',
    transform: iptvOrgTransform,
  },
];

export const iptvOrgStreamSources: TSources = [
  {
    name: 'iptv.org stream China',
    filename: 'o_s_cn',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u',
    transform: iptvOrgTransform,
  },
  {
    name: 'iptv.org stream China 112114',
    filename: 'o_s_cn_112114',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn_112114.m3u',
    transform: iptvOrgTransform,
  },
  {
    name: 'iptv.org stream China CCTV',
    filename: 'o_s_cn_cctv',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn_cctv.m3u',
    transform: iptvOrgTransform,
  },
  {
    name: 'iptv.org stream China CGTN',
    filename: 'o_s_cn_cgtn',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn_cgtn.m3u',
    transform: iptvOrgTransform,
  },
];
