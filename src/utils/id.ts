import { getChannelName } from '../playlist/extinf';
import { converter } from './converter';

/** 用于跨源匹配同一频道的 id：繁转简、小写，并去掉清晰度、括号备注等后缀 */
export const getChannelId = (extinf: string) => {
  const name = converter(getChannelName(extinf)).toLowerCase();

  return name
    .replace(/\[([^]]*)\]/g, '')
    .replace(/\(([^)]*)\)/g, '')
    .replace(/（([^）]*)）/g, '')
    .replace(/「([^」]+)」/g, '')
    .replace(/-/g, '')
    .replace(/@@[0-9]*/g, '')
    .replace(/Ⅰ/g, '')
    .replace(/ 8m/g, '')
    .replace(/([^|]+)\|/g, '')
    .replace(/([^ⅰ]+)ⅰ/g, '')
    .replace(/([\u4e00-\u9fff]+)\s+([\u4e00-\u9fff]+)/g, '$1$2')
    .replace(/ +/g, ' ')
    .trim();
};
