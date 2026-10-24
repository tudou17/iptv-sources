import { converter } from '../utils/converter';
import { getChannelLogoUrl, parseExtinf, toStandardName, updateExtinf } from './extinf';
import type { IChannel, IPlaylist } from './index';

/** 没有分组时使用的 group-title */
export const DEFAULT_GROUP = '未分类';

/** 去掉频道名里的 `@@123`、`[geo-blocked]` 标记及首尾空格 */
export const cleanChannelName = (name: string) =>
  name
    .replace(/@@[0-9]*/g, '')
    .replace(/\[geo-blocked\]/gi, '')
    .trim();

const normalizeName = (name: string) => converter(cleanChannelName(name));

const isUrlValue = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

/**
 * 默认改写：
 * - 频道名、tvg-name：去掉标记、繁转简
 * - 其他属性值繁转简（logo 等 URL 值除外）
 * - 缺失（或为空）的 tvg-name / tvg-logo / group-title 补全，logo 按 tvg-name 生成
 * 播放地址不做改动。
 */
export const normalizeChannel = (channel: IChannel): IChannel => {
  const parsed = parseExtinf(channel.extinf);
  if (!parsed) return channel;

  const name = normalizeName(parsed.name);
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.attrs)) {
    attrs[key] = isUrlValue(value) ? value : converter(value);
  }
  const originalTvgName = parsed.attrs['tvg-name'] ?? '';
  const tvgName = originalTvgName ? normalizeName(originalTvgName) : toStandardName(name);
  attrs['tvg-name'] = tvgName;
  attrs['tvg-logo'] ||= getChannelLogoUrl(originalTvgName ? toStandardName(tvgName) : tvgName);
  attrs['group-title'] ||= DEFAULT_GROUP;

  return { extinf: updateExtinf(channel.extinf, { name, attrs }), url: channel.url };
};

export const normalizePlaylist = ({ header, channels }: IPlaylist): IPlaylist => ({
  header,
  channels: channels.map(normalizeChannel),
});
