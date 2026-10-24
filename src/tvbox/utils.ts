import { promises as fsPromises } from 'fs';
import path from 'path';

import { parseTvboxJson, type TVBoxConfig } from '@whyun/tv-tools';
import { projectRoot } from '../file';
import { CHANNEL_LOGO_BASE_URL } from '../playlist';
import { getCustomUrl } from '../utils';
const TVBOX_JSON_URL = 'http://tvbox.xn--4kq62z5rby2qupq9ub.top/';
async function fetchBodyTextWithOkhttp(url: string): Promise<{
  bodyText: string;
  ok: boolean;
}> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'okhttp',
    },
    signal: AbortSignal.timeout(15000),
  });

  return {
    bodyText: await response.text(),
    ok: response.ok,
  };
}

interface ITvBoxLiveSrc {
  name: string;
  filename: string;
}

const genTvBoxJson = async (srcs: ITvBoxLiveSrc[]): Promise<TVBoxConfig> => {
  if (srcs.length < 1) {
    throw new Error('No sources for tvbox found!');
  }
  const response = await fetchBodyTextWithOkhttp(TVBOX_JSON_URL);
  const parsedConfig = parseTvboxJson(response.bodyText);
  const j = {
    ...parsedConfig,
    lives: [],
  } as TVBoxConfig;

  j.lives = srcs.map(({ name, filename }) => ({
    // group: name,
    // channels: [
    //   {
    //     name,
    //     urls: [`${getCustomUrl()}/txt/${filename}.txt`],
    //     epg: `https://iptv-sources2.pages.dev/epg/pw-7/{date}/${filename}.json`,
    //     // logo: `https://tv-res.pages.dev/logo/${filename}.png`,
    //   },
    // ],
    name,
    type: 0,
    url: `${getCustomUrl()}/txt/${filename}.txt`,
    epg: `${getCustomUrl()}/epg/pw-7/{date}/{name}.json`,
    logo: `${CHANNEL_LOGO_BASE_URL}/{name}.png`,
  }));

  return j;
};

export const writeTvBoxJson = async (filename: string, srcs: ITvBoxLiveSrc[]): Promise<void> => {
  const tvboxDir = path.join(projectRoot, 'm3u', 'tvbox');

  await fsPromises.mkdir(tvboxDir, { recursive: true });
  await fsPromises.writeFile(
    path.join(tvboxDir, `${filename}.json`),
    JSON.stringify(await genTvBoxJson(srcs))
  );
};
