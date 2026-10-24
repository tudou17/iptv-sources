import { getChannelName, type IChannel, isStreamUrl } from '../playlist';
import { getFromInfo } from '../utils';

/** 单个播放列表的频道列表页（LIST.temp.md） */
export const renderChannelList = (
  template: string,
  name: string,
  filename: string,
  channels: IChannel[]
) => {
  const rows = channels
    .filter(({ url }) => isStreamUrl(url))
    .map(({ extinf, url }, idx) => {
      const channelName = getChannelName(extinf).replace(/\|/g, '').trim();
      return `| ${idx + 1} | ${channelName} | ${getFromInfo(url)} | <${url}> |`;
    });

  return template
    .replace(
      '<!-- list_title_here -->',
      `# List for **${name}**\n\n> M3U: [${filename}.m3u](/${filename}.m3u), TXT: [${filename}.txt](/txt/${filename}.txt)`
    )
    .replace('<!-- channels_here -->', `${rows.join('\n')}\n\nUpdated at **${new Date()}**`);
};
