import { txtToPlaylist } from '../playlist';
import type { TSources } from './utils';

export const youhunSources: TSources = [
  {
    name: 'youhunwl/TVAPP',
    filename: 'youhun',
    url: 'https://www.iyouhun.com/tv/zb',
    parse: txtToPlaylist,
  },
];
