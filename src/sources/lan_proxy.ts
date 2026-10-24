import 'dotenv/config';

import type { IPlaylist } from '../playlist';
import type { ISourceOutput } from './utils';

/**
 * 组播源需要在局域网内经 udpxy / rtp2httpd 转发才能播放，
 * 这里为每个常见网关生成一份 `http://<网关>:<端口>/rtp/...` 地址的播放列表。
 */

/** 常见路由器网关网段：192.168.0~10、192.168.123、10.0.0 */
export const DEFAULT_IPTV_PROXY_IP_RANGES = '192.168.0-10,192.168.123,10.0.0';
export const DEFAULT_IPTV_PROXY_PORT = 23234;

const expandOctet = (octet: string) => {
  const match = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(octet.trim());
  if (!match) return undefined;

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  if (start > end || end > 255) return undefined;

  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
};

/**
 * 解析网关网段配置，返回去重后的网段前缀（如 `192.168.1`），代理地址为 `<前缀>.1`。
 * 格式：逗号分隔的网段前三段，每段可写成范围，如 `192.168.0-10,192.168.123,10.0.0`。
 * 格式错误时返回 undefined。
 */
export const parseIptvProxyIpRanges = (value: string) => {
  const prefixes = value
    .split(',')
    .map((range) => range.trim())
    .filter(Boolean)
    .map((range) => {
      const octets = range.split('.').map(expandOctet);
      if (octets.length !== 3 || octets.some((o) => !o)) return undefined;

      const [a, b, c] = octets as string[][];
      return a.flatMap((x) => b.flatMap((y) => c.map((z) => `${x}.${y}.${z}`)));
    });
  if (!prefixes.length || prefixes.some((p) => !p)) return undefined;

  return [...new Set(prefixes.flat() as string[])];
};

const resolveLanIpPrefixes = () => {
  const value = process.env.IPTV_PROXY_IP_RANGES?.trim();
  if (!value) return parseIptvProxyIpRanges(DEFAULT_IPTV_PROXY_IP_RANGES) as string[];

  const prefixes = parseIptvProxyIpRanges(value);
  if (!prefixes) {
    console.warn(
      `[WARNING] Invalid IPTV_PROXY_IP_RANGES "${value}", fallback to "${DEFAULT_IPTV_PROXY_IP_RANGES}"`
    );
    return parseIptvProxyIpRanges(DEFAULT_IPTV_PROXY_IP_RANGES) as string[];
  }
  // 每个网段约 95 个组播源 × (m3u/txt/list/sources) 4 个文件，Cloudflare Pages 单站上限 2 万个文件
  if (prefixes.length > 50) {
    console.warn(
      `[WARNING] IPTV_PROXY_IP_RANGES expands to ${prefixes.length} prefixes, the output may exceed Cloudflare Pages' 20000 files limit`
    );
  }
  return prefixes;
};

const resolveProxyPort = () => {
  const value = process.env.IPTV_PROXY_PORT?.trim();
  if (!value) return DEFAULT_IPTV_PROXY_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.warn(
      `[WARNING] Invalid IPTV_PROXY_PORT "${value}", fallback to ${DEFAULT_IPTV_PROXY_PORT}`
    );
    return DEFAULT_IPTV_PROXY_PORT;
  }
  return port;
};

export const LAN_IP_PREFIXES = resolveLanIpPrefixes();
export const IPTV_PROXY_PORT = resolveProxyPort();

export const getLanProxyOrigin = (lanIpPrefix: string, port: number = IPTV_PROXY_PORT) =>
  `http://${lanIpPrefix}.1:${port}`;

/** 把 `rtp://` / `udp://` 组播地址改写为代理地址，其他地址原样返回 */
export const replaceWithLanProxyUrl = (
  url: string,
  lanIpPrefix: string,
  port: number = IPTV_PROXY_PORT
) => {
  const match = /^(rtp|udp):\/\/(.+)$/.exec(url);
  if (!match) return url;

  return `${getLanProxyOrigin(lanIpPrefix, port)}/${match[1]}/${match[2]}`;
};

/** 代理版本的文件名：`<原文件名>_192_168_1` */
export const getLanProxyFilename = (baseFilename: string, lanIpPrefix: string) =>
  `${baseFilename}_${lanIpPrefix.replace(/\./g, '_')}`;

/** 为每个网段生成一份改写了播放地址的输出 */
export const expandLanProxyOutputs = (
  playlist: IPlaylist,
  baseFilename: string,
  rewriteUrl: (url: string, lanIpPrefix: string) => string = replaceWithLanProxyUrl
): ISourceOutput[] =>
  LAN_IP_PREFIXES.map((lanIpPrefix) => ({
    filename: getLanProxyFilename(baseFilename, lanIpPrefix),
    playlist: {
      ...playlist,
      channels: playlist.channels.map((channel) => ({
        ...channel,
        url: rewriteUrl(channel.url, lanIpPrefix),
      })),
    },
    lanProxy: { ipPrefix: lanIpPrefix, baseFilename },
  }));
