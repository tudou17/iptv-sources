import { channelsLogo } from './const';

const isFmmlLogoChannel = (c: string) => channelsLogo.includes(c);

/**
 * @deprecated 计划建立自己的 logo 库，等待移除
 * @param c
 * @returns
 */
export const withFmmlLogoChannel = (c: string) =>
  isFmmlLogoChannel(c)
    ? `https://live.fanmingming.com/tv/${c}.png`
    : isFmmlLogoChannel(c.toLowerCase())
      ? `https://live.fanmingming.com/tv/${c.toLowerCase()}.png`
      : void 0;
