// import { withGithubRawUrlProxy } from '../sources';
import type { TEPGSource } from './utils';

export const epgSources: TEPGSource[] = [
  // {
  //     name: "112114.xyz",
  //     filename: "112114_xyz",
  //     url: "https://epg.112114.xyz/pp.xml",
  // },
  // {
  //     name: "fanmingming/live",
  //     filename: "fmml",
  //     url: "https://raw.githubusercontent.com/fanmingming/live/main/e.xml",
  // },
  {
    name: '51zmt.top',
    filename: '51zmt',
    url: 'https://m3u.ibert.me/epg/51zmt.xml',
  },
  {
    name: '51zmt.top cc',
    filename: '51zmt_cc',
    url: 'https://m3u.ibert.me/epg/51zmt_cc.xml',
  },
  {
    name: '51zmt.top difang',
    filename: '51zmt_df',
    url: 'https://m3u.ibert.me/epg/51zmt_df.xml',
  },
];
