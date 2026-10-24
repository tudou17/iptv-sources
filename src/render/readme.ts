import type { TEPGSource } from '../epgs/utils';
import type { ISourceBuildResult } from '../pipeline/sources';
import { CHINA_IPTV_SOURCE_PREFIX } from '../sources';
import { getLanListFilename } from './lan_list';

export const isChinaIptvResult = ({ source }: ISourceBuildResult) =>
  source.name.startsWith(CHINA_IPTV_SOURCE_PREFIX);

/** README 频道表：每个源一行，链接到第一个输出；CHINA-IPTV 单独成页，不在此列出 */
export const renderSourceRows = (results: ISourceBuildResult[]) =>
  results
    .map((result) => {
      const { name } = result.source;
      const first = result.outputs[0];
      if (!first || isChinaIptvResult(result)) return '';

      const { filename: f, channelCount } = first;
      const lanListFilename = getLanListFilename(result);
      const moreLink = lanListFilename
        ? `<br> **[局域网 IP 列表](/list/${lanListFilename}.more.list)**`
        : '';

      return `| ${name} | [${f}.m3u](/${f}.m3u) <br> [${f}.txt](/txt/${f}.txt) | [List for ${name}](/list/${f}.list)${moreLink} | ${
        channelCount === undefined ? 'update failed' : channelCount
      } |`;
    })
    .filter(Boolean)
    .join('\n');

export const renderEpgRows = (epgs: TEPGSource[], epgResults: boolean[]) =>
  `${epgs
    .map(
      (e, idx) =>
        `| ${e.name} | [${e.filename}.xml](/epg/${e.filename}.xml) | ${
          epgResults[idx] ? '✅' : 'update failed'
        } |`
    )
    .join('\n')}
| epg.pw（中国地区聚合） | [epg_pw.xml.gz](/epg/epg_pw.xml.gz) | 独立构建 |

\n\nUpdated at **${new Date()}**`;

/** 站点首页（README.temp.md） */
export const renderReadme = (
  template: string,
  results: ISourceBuildResult[],
  epgs: TEPGSource[],
  epgResults: boolean[]
) =>
  template
    .replace('<!-- channels_here -->', renderSourceRows(results))
    .replace('<!-- epgs_here -->', renderEpgRows(epgs, epgResults));
