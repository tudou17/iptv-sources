import 'dotenv/config';

import type { IChannel, IPlaylist } from '../playlist';
import { normalizePlaylist, m3uToPlaylist } from '../playlist';
import { getGithubRawProxyUrl, replaceGithubRawProxyUrl } from '../utils';

/** 需要拉取的远程文件 */
export interface IRemoteSource {
  name: string;
  /**
   * 输出文件名（不含扩展名）。
   * 可以带 `/` 分隔的文件夹前缀，如 `fmml/ipv6`，
   * 会输出到 m3u/fmml/ipv6.m3u、m3u/txt/fmml/ipv6.txt 等。
   * 请统一使用 `/`（而非 `\`），因为同一个值也会被拼进 URL。
   */
  filename: string;
  url: string;
}

/** 一个源生成的一份播放列表 */
export interface ISourceOutput {
  filename: string;
  playlist: IPlaylist;
  /** 收集到 sources.json 的频道（去重前的全部候选），缺省为 playlist.channels */
  candidates?: IChannel[];
  /** 局域网代理版本才有 */
  lanProxy?: {
    /** 网段前缀，如 `192.168.1` */
    ipPrefix: string;
    /** 未加网段后缀的文件名 */
    baseFilename: string;
  };
}

export interface ISource extends IRemoteSource {
  /** 把上游原文解析为播放列表，默认按 m3u 解析 */
  parse?: (raw: string) => IPlaylist;
  /** 由播放列表生成输出文件，默认原样输出到 filename */
  transform?: (playlist: IPlaylist, filename: string) => ISourceOutput[];
  /** 是否把频道地址收集到 sources.json，默认 true；全量大源关闭 */
  collectSources?: boolean;
  /** 是否对输出做默认改写（见 normalizeChannel），默认 true；需要原样输出时关闭 */
  normalize?: boolean;
}

export type TSources = ISource[];

export const buildSourceOutputs = (source: ISource, raw: string): ISourceOutput[] => {
  const playlist = (source.parse ?? m3uToPlaylist)(raw);
  const outputs = source.transform
    ? source.transform(playlist, source.filename)
    : [{ filename: source.filename, playlist }];

  if (source.normalize === false) return outputs;
  return outputs.map((output) => ({ ...output, playlist: normalizePlaylist(output.playlist) }));
};

/** tvg-logo 中的 GitHub raw 地址走代理 */
export const withGithubRawLogoProxy = (playlist: IPlaylist): IPlaylist => ({
  ...playlist,
  channels: playlist.channels.map((channel) => ({
    ...channel,
    extinf: replaceGithubRawProxyUrl(channel.extinf),
  })),
});

export const withGithubRawUrlProxy = (u: string) => {
  return process.env.CLOSE_SOURCE_PROXY?.trim() === 'true' ? u : `${getGithubRawProxyUrl()}/${u}`;
};
