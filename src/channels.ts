import path from 'path';
import fs from 'fs';

import type { TEPGSource } from './epgs/utils';
import { projectRoot } from './file';
import type { ISourceBuildResult } from './pipeline/sources';
import { getCustomUrl } from './utils';

export interface IChannel {
  name: string;
  m3u: string;
  count: number | undefined;
}

export interface IEPG {
  name: string;
  epg: string;
}

export interface IChannelsResult {
  builderVersion?: number; // 构建版本标识符
  channels: IChannel[];
  epgs: IEPG[];
  updated_at: number;
}

export const updateChannelsJson = (results: ISourceBuildResult[], epgs: TEPGSource[]) => {
  const m3uDir = path.join(projectRoot, 'm3u');
  const url = getCustomUrl();

  const result: IChannelsResult = {
    builderVersion: 1,
    channels: results.flatMap(({ source, outputs }) =>
      outputs.map(({ filename, channelCount }) => ({
        name: source.name,
        m3u: `${url}/${filename}.m3u`,
        count: channelCount,
      }))
    ),
    epgs: epgs.map((epg) => ({
      name: epg.name,
      epg: `${url}/epg/${epg.filename}.xml`,
    })),
    updated_at: new Date().getTime(),
  };

  fs.mkdirSync(m3uDir, { recursive: true });
  fs.writeFileSync(path.join(m3uDir, 'channels.json'), JSON.stringify(result));
};
