import { buildChannelExtinf, LIVE_DURATION, parseExtinf } from './extinf';
import { DEFAULT_GROUP } from './normalize';

export * from './extinf';
export * from './normalize';

/** 一个频道：`#EXTINF` 行 + 播放地址 */
export interface IChannel {
  extinf: string;
  url: string;
}

export interface IPlaylist {
  /** `#EXTM3U` 头部行，上游没有时为 undefined */
  header?: string;
  channels: IChannel[];
}

const HEADER_REGEXP = /#EXTM3U/;
const URL_REGEXP = /^([a-z][a-z0-9+.-]*):\/\/([^/]+)/i;

/** 是否为带协议头的播放地址，如 `http://host/...`、`rtp://239.0.0.1:1234` */
export const isStreamUrl = (url: string | undefined) => !!url && URL_REGEXP.test(url);

const splitLines = (raw: string) =>
  raw
    .trim()
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !!line);

/**
 * 解析 m3u：只保留 `#EXTM3U` 头部，以及紧挨着的「直播频道 `#EXTINF:-1...` + 带协议的地址」行对，
 * 其余行（注释、`#EXTVLCOPT` 等）全部丢弃。
 */
export const m3uToPlaylist = (raw: string): IPlaylist => {
  const lines = splitLines(raw);
  const playlist: IPlaylist = { channels: [] };

  for (let i = 0; i < lines.length; i++) {
    if (HEADER_REGEXP.test(lines[i])) {
      playlist.header ??= lines[i];
      continue;
    }

    if (parseExtinf(lines[i])?.duration === LIVE_DURATION && isStreamUrl(lines[i + 1])) {
      playlist.channels.push({ extinf: lines[i], url: lines[i + 1] });
      i++;
    }
  }

  return playlist;
};

/** txt 转出的 m3u 使用的 EPG 地址 */
export const TXT_EPG_URL = 'https://tv.whyun.com/epg/51zmt.xml';

/**
 * 解析 `名称,地址` 格式的 txt，`分组,#genre#` 行作为后续频道的分组，
 * 并补全 tvg-id / tvg-name / tvg-logo / group-title。
 */
export const txtToPlaylist = (raw: string): IPlaylist => {
  const lines = raw
    .trim()
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => !!line);
  const channels: IChannel[] = [];
  let group = DEFAULT_GROUP;

  for (const line of lines) {
    const [name, url] = line
      .trim()
      .split(',')
      .map((s) => s?.trim());
    if (url == '#genre#') {
      group = name;
      continue;
    }

    if (!name || !url) {
      continue;
    }

    channels.push({ extinf: buildChannelExtinf(name, { group }), url });
  }

  return { header: `#EXTM3U x-tvg-url="${TXT_EPG_URL}"`, channels };
};

export const playlistToM3u = ({ header, channels }: IPlaylist) =>
  [...(header === undefined ? [] : [header]), ...channels.flatMap((c) => [c.extinf, c.url])].join(
    '\n'
  );

/** 转为 TVBox 使用的 txt：按 group-title 分组输出 `分组,#genre#` 与 `名称,地址` */
export const playlistToTxt = ({ channels }: IPlaylist) => {
  const groups = new Map<string, string>();

  for (const { extinf, url } of channels) {
    const parsed = parseExtinf(extinf);
    const channelName = parsed?.name.trim() ?? '';
    const group = parsed?.attrs['group-title']?.trim() || DEFAULT_GROUP;

    groups.set(group, (groups.get(group) ?? '') + `${channelName.replace(/\s+/g, '_')},${url}\n`);
  }

  let txt = '';
  groups.forEach((lines, group) => {
    txt += `${group},#genre#\n${lines}\n`;
  });
  return txt.substring(0, txt.length - 2);
};

/** 按 key 去重，保留第一次出现的频道 */
export const dedupeChannels = (channels: IChannel[], keyOf: (channel: IChannel) => string) => {
  const seen = new Set<string>();
  return channels.filter((channel) => {
    const key = keyOf(channel);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
