import { hrtime } from 'process';

import { buildEpgPwXml } from '../epgs/epg_pw';
import type { TEPGSource } from '../epgs/utils';
import { getContent, writeEpgXML, writeEpgXmlGz } from '../file';

/** 拉取一个 EPG 源并写出 xml，返回是否成功 */
export const buildEpg = async (epgSource: TEPGSource): Promise<boolean> => {
  console.log(`[TASK] Fetch EPG ${epgSource.name}`);
  try {
    const [ok, text, now] = await getContent(epgSource);

    if (ok && !!text) {
      console.log(
        `Fetch EPG from ${epgSource.name} finished, cost ${
          (parseInt(hrtime.bigint().toString()) - parseInt(now.toString())) / 10e6
        } ms`
      );
      await writeEpgXML(epgSource.filename, text);
      return true;
    }
    console.log(`[WARNING] EPG ${epgSource.name} get failed!`);
    return false;
  } catch (e) {
    console.warn('Error fetching EPG', e, epgSource);
    console.log(`[WARNING] EPG ${epgSource.name} get failed!`);
    return false;
  }
};

/**
 * epg.pw EPG: 从频道列表页抓取所有频道并逐一拉取 EPG，合并为完整 XML
 * 仅输出 .xml.gz：合并后体积可能超过 Cloudflare Pages 25MB 单文件上限
 */
export const buildEpgPw = async () => {
  try {
    console.log('[TASK] Build EPG from epg.pw ...');
    const epgPwXml = await buildEpgPwXml();
    await writeEpgXmlGz('epg_pw', epgPwXml);
    console.log('[TASK] EPG from epg.pw written successfully');
  } catch (e) {
    console.warn('[WARNING] EPG from epg.pw failed:', e);
  }
};
