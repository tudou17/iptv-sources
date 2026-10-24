import fs from 'fs';
import path from 'path';

import type { TEPGSource } from '../epgs/utils';
import { projectRoot } from '../file';
import type { IChannel } from '../playlist';
import type { ISourceBuildResult } from '../pipeline/sources';
import { renderChannelList } from './channel_list';
import { renderIptvRegionPage } from './iptv_region';
import { getLanListFilename, renderLanIpList } from './lan_list';
import { renderReadme } from './readme';

export * from './channel_list';
export * from './iptv_region';
export * from './lan_list';
export * from './readme';

const m3uDir = path.join(projectRoot, 'm3u');
const listDir = path.join(m3uDir, 'list');

/** 写入 m3u/list 下的页面，filename 可带 `/` 目录前缀 */
const writeListPage = (filename: string, ext: string, content: string) => {
  const file = path.join(listDir, ...filename.split('/').filter(Boolean)) + ext;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

let listTemplate: string | undefined;

export const writeChannelList = (name: string, filename: string, channels: IChannel[]) => {
  listTemplate ??= fs.readFileSync(path.join(projectRoot, 'LIST.temp.md'), 'utf8');
  writeListPage(filename, '.list.md', renderChannelList(listTemplate, name, filename, channels));
};

/** 写入首页 README、各源的局域网 IP 列表页和 CHINA-IPTV 地区页 */
export const writeReadmePages = (
  results: ISourceBuildResult[],
  epgs: TEPGSource[],
  epgResults: boolean[]
) => {
  results.forEach((result) => {
    const lanListFilename = getLanListFilename(result);
    if (lanListFilename) {
      writeListPage(lanListFilename, '.more.list.md', renderLanIpList(result));
    }
  });

  writeListPage('iptv', '.list.md', renderIptvRegionPage(results));

  const template = fs.readFileSync(path.join(projectRoot, 'README.temp.md'), 'utf8');
  fs.mkdirSync(m3uDir, { recursive: true });
  fs.writeFileSync(
    path.join(m3uDir, 'README.md'),
    renderReadme(template, results, epgs, epgResults)
  );
};
