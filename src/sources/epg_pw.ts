import { dedupeChannels, getChannelAttr } from '../playlist';
import type { ISource, TSources } from './utils';

const getTvgName = (extinf: string) => getChannelAttr(extinf, 'tvg-name');

/** 只保留带 tvg-name 的频道，按 tvg-name 去重 */
export const epgPwTransform: ISource['transform'] = ({ header, channels }, filename) => {
  const candidates = channels.filter(({ extinf }) => !!getTvgName(extinf));
  const deduped = dedupeChannels(candidates, ({ extinf }) => getTvgName(extinf)!);

  return [
    {
      filename,
      playlist: { header, channels: deduped },
      candidates,
    },
  ];
};

export const epgPwSources: TSources = [
  {
    name: 'epg.pw China',
    filename: 'cn',
    url: 'https://epg.pw/test_channels_china.m3u',
    transform: epgPwTransform,
  },
  // {
  //   name: 'epg.pw China National',
  //   filename: 'cn_n',
  //   url: 'https://epg.pw/test_channels_china_national.m3u',
  //   transform: epgPwTransform,
  // },
  // {
  //   name: 'epg.pw China Country',
  //   filename: 'cn_c',
  //   url: 'https://epg.pw/test_channels_china_country.m3u',
  //   transform: epgPwTransform,
  // },
  // {
  //   name: 'epg.pw China Province',
  //   filename: 'cn_p',
  //   url: 'https://epg.pw/test_channels_china_province.m3u',
  //   transform: epgPwTransform,
  // },
  {
    name: 'epg.pw All',
    filename: 'all',
    url: 'https://epg.pw/test_channels_all.m3u',
    transform: epgPwTransform,
    collectSources: false,
  },
];
