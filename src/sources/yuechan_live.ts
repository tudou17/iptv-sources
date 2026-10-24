import { withGithubRawLogoProxy, type TSources } from './utils';

export const yuechanLiveSources: TSources = [
  {
    name: 'YueChan-Live IPTV',
    filename: 'ycl_iptv',
    url: 'https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u',
    transform: (playlist, filename) => [{ filename, playlist: withGithubRawLogoProxy(playlist) }],
  },
];
