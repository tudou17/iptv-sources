/**
 * 从 epg.pw 获取中国地区频道列表，逐频道拉取 EPG 数据，合并生成完整 XMLTV 格式 EPG 文件
 *
 * 流程：
 *  1. 访问 https://epg.pw/areas/cn.html?lang=zh-hans 提取频道 ID 与名称
 *  2. 对每个频道调用 https://epg.pw/api/epg.xml?lang=zh-hans&date=YYYYMMDD&channel_id=ID
 *  3. 使用 xml2js 解析各响应中的 <channel> 与 <programme> 节点
 *  4. 去重合并后由 Builder 输出一份完整的 XMLTV XML
 */

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// import { writeEpgJsonFromXml } from '../file';
import type { EpgChannelJson } from './parser';
import { formatHourMinute, parseXmltvTimestamp } from './time';
import {
  buildXmlDocument,
  normalizeXmlList,
  parseXmltvRoot,
  readXmlAttr,
  readXmltvChannelName,
  readXmltvProgrammeTitle,
  type XmltvChannelNode,
  type XmltvNode,
  type XmltvProgrammeNode,
} from './xml';
import { createSubDirectory } from '../file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EpgPwChannel {
  id: string;
  name: string;
}
/**
 * 从 epg.pw 频道列表页 HTML 中提取频道 ID 与名称
 * 链接格式: href="/last/464609.html?lang=zh-hans"
 */
export function parseChannelListFromHtml(html: string): EpgPwChannel[] {
  const regex = /href="\/last\/(\d+)\.html\?lang=zh-hans"[^>]*>([^<]+)<\/a>/g;
  const channels: EpgPwChannel[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    const name = match[2].trim();
    if (name && !seen.has(id)) {
      seen.add(id);
      channels.push({ id, name });
    }
  }

  return channels;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function genTvBoxDateString(originalString: string): string {
  const y = originalString.slice(0, 4);
  const m = originalString.slice(4, 6);
  const d = originalString.slice(6, 8);
  return `${y}-${m}-${d}`;
}

function genTvBoxChannelName(originalString: string): string {
  // 去掉 CCTV 与数字间的连字符: CCTV-1 -> CCTV1
  const name = originalString.toUpperCase().replace(/^CCTV-(\d)/, 'CCTV$1');

  // CCTV-4 多语言：仅 (亚洲) 归一为 CCTV4，(美洲)/(欧洲) 保留地区
  const region = name.match(/^CCTV4\s*\(?(亚洲|美洲|欧洲)\)?/);
  if (region) {
    return region[1] === '亚洲' ? 'CCTV4' : name;
  }

  // CCTV5+ 等：保留 +
  const plus = name.match(/^(CCTV\d+\+)/);
  if (plus) return plus[1];

  // CCTV4K/CCTV8K：保留 K
  const k = name.match(/^(CCTV\d+K)/);
  if (k) return k[1];

  // 普通 CCTV\d+：去掉数字后的非数字后缀
  return name.replace(/^(CCTV\d+)[^\d]*$/, '$1');
}

async function fetchChannelEpg(channelId: string, date: string): Promise<string | null> {
  const url = `https://epg.pw/api/epg.xml?lang=zh-hans&date=${date}&channel_id=${channelId}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function channelIdFromNode(node: XmltvChannelNode): string | null {
  return readXmlAttr(node, 'id') || null;
}

/**
 * 解析单份 epg.pw API 返回的 XMLTV 片段
 * 该接口按 channel_id 请求，响应中只会包含当前频道的 <channel> 与其 <programme> 列表
 */
export function parsePwEpgXml(xml: string): {
  channel: XmltvChannelNode | null;
  programmes: XmltvProgrammeNode[];
} {
  const tv = parseXmltvRoot(xml) as XmltvNode | null;
  if (!tv) {
    return { channel: null, programmes: [] };
  }

  const [channel] = normalizeXmlList(tv.channel);

  return {
    channel: channel ?? null,
    programmes: normalizeXmlList(tv.programme),
  };
}

export function buildPwChannelJson(
  channelNode: XmltvChannelNode | undefined,
  programmes: XmltvProgrammeNode[]
): EpgChannelJson {
  const channel = readXmltvChannelName(channelNode).toLowerCase();

  return {
    channel,
    epg_data: programmes
      .map((programme) => {
        const startTime = parseXmltvTimestamp(readXmlAttr(programme, 'start'));
        const endTime = parseXmltvTimestamp(readXmlAttr(programme, 'stop'));
        if (!startTime || !endTime) return null;

        return {
          start: formatHourMinute(startTime),
          end: formatHourMinute(endTime),
          title: readXmltvProgrammeTitle(programme),
        };
      })
      .filter((item): item is EpgChannelJson['epg_data'][number] => item !== null),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 从 epg.pw 构建完整的 XMLTV EPG XML
 * @param dates - 日期列表（YYYYMMDD 格式），默认仅当天
 * @param batchSize - 并发请求数，默认 10
 * @param delayMs - 批次间延迟（毫秒），默认 300
 */
export async function buildEpgPwXml(batchSize = 10, delayMs = 300): Promise<string> {
  console.log('[EPG.PW] Fetching channel list from https://epg.pw/areas/cn.html ...');
  const res = await fetch('https://epg.pw/areas/cn.html?lang=zh-hans', {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`[EPG.PW] Failed to fetch channel list: ${res.status}`);
  const html = await res.text();

  const channels = parseChannelListFromHtml(html);
  console.log(`[EPG.PW] Extracted ${channels.length} channels`);

  if (channels.length === 0) {
    throw new Error('[EPG.PW] No channels found — page may require JavaScript rendering');
  }

  const dates: string[] = [];
  const today = new Date();
  for (let i = -5; i < 2; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(formatDate(date));
  }

  const seenChannelIds = new Set<string>();
  const channelNodes: XmltvChannelNode[] = [];
  const programmeNodes: XmltvProgrammeNode[] = [];
  // const epgDir = makeEpgDir();
  const basePath = await createSubDirectory('./m3u/epg/pw-7');

  for (const date of dates) {
    console.log(`[EPG.PW] Fetching EPG for date ${date} ...`);
    const savePath = path.join(basePath, genTvBoxDateString(date));
    await mkdir(savePath, { recursive: true });
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((ch) => fetchChannelEpg(ch.id, date)));
      const writePromises = results.map(async (result) => {
        if (result.status !== 'fulfilled' || !result.value) {
          return;
        }
        const { channel, programmes } = parsePwEpgXml(result.value);
        if (!channel) {
          return;
        }

        const channelId = channelIdFromNode(channel);
        if (channelId && !seenChannelIds.has(channelId)) {
          seenChannelIds.add(channelId);
          channelNodes.push(channel);
        }

        const json = buildPwChannelJson(channel, programmes);
        const currentChannelName = genTvBoxChannelName(json.channel);
        const savedFullPath = path.join(savePath, `${currentChannelName}.json`);
        await writeFile(savedFullPath, JSON.stringify(json, null, 2));
        console.info(`[EPG.PW] Saved EPG for channel ${json.channel} to (${savedFullPath})`);
        programmeNodes.push(...programmes);
      });
      await Promise.all(writePromises);
      const progress = Math.min(i + batchSize, channels.length);
      console.log(`[EPG.PW]   [${date}] ${progress}/${channels.length}`);

      if (i + batchSize < channels.length) {
        await sleep(delayMs);
      }
    }
  }

  console.log(
    `[EPG.PW] Done — ${seenChannelIds.size} channels, ${programmeNodes.length} programmes`
  );

  const tvBody = buildXmlDocument({
    tv: {
      channel: channelNodes,
      programme: programmeNodes,
    },
  });
  const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n${tvBody}`;

  // TVBox EPG：与 docs/EPG.md 一致，写入 epg/epg_pw/{date}/{name}.json
  // console.log('[EPG.PW] Writing TVBox EPG JSON files ...');
  // writeEpgJsonFromXml('epg_pw', fullXml);

  return fullXml;
}
