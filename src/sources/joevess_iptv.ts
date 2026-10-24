import type { ISource, TSources } from './utils';

/** 上游可能缺少 `#EXTM3U` 头部，补上 */
export const joevessIptvTransform: ISource['transform'] = ({ header, channels }, filename) => [
  { filename, playlist: { header: header ?? '#EXTM3U', channels } },
];

export const joevessIptvSources: TSources = [
  {
    name: 'joevess/IPTV home',
    filename: 'j_home',
    url: 'https://raw.githubusercontent.com/joevess/IPTV/main/home.m3u8',
    transform: joevessIptvTransform,
  },
  {
    name: 'joevess/IPTV iptv',
    filename: 'j_iptv',
    url: 'https://raw.githubusercontent.com/joevess/IPTV/main/iptv.m3u8',
    transform: joevessIptvTransform,
  },
];
