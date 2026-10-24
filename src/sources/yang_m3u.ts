import { withGithubRawLogoProxy, type TSources } from './utils';

export const yangM3uSources: TSources = [
  {
    name: 'YanG-1989 Gather',
    filename: 'y_g',
    url: 'https://raw.githubusercontent.com/YanG-1989/m3u/main/Gather.m3u',
    transform: (playlist, filename) => [{ filename, playlist: withGithubRawLogoProxy(playlist) }],
  },
];
