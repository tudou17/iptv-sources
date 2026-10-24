import { updateChannelsJson } from './channels';
import { epgSources } from './epgs';
import { cleanFiles, mergeSources, mergeTxts, writeEpgJsonByDate } from './file';
import { buildEpg, buildEpgPw } from './pipeline/epgs';
import { buildSource, type ISourceBuildResult } from './pipeline/sources';
import { writeReadmePages } from './render';
import { CHINA_IPTV_SOURCE_PREFIX, sources } from './sources';
import { runCustomTask } from './task/custom';
import { writeTvBoxJson } from './tvbox';

/** TVBox 依赖远程配置，失败时不能阻断后续 channels.json / README 的生成 */
const writeTvBoxLiveJson = async (results: ISourceBuildResult[]) => {
  try {
    // 运营商 IPTV 源只能在对应网络内播放，且数量很大，不放进 TVBox 配置
    const tvboxSources = results
      .filter(({ source }) => !source.name.startsWith(CHINA_IPTV_SOURCE_PREFIX))
      .flatMap(({ source, outputs }) =>
        outputs.map(({ filename }) => ({ name: source.name, filename }))
      );
    await writeTvBoxJson('tvbox', tvboxSources);
  } catch (e) {
    console.warn('[WARNING] Write TVBox json failed:', e);
  }
};

cleanFiles();

(async () => {
  try {
    const sourceResults = await Promise.all(sources.map(buildSource));
    const epgResults = await Promise.all(epgSources.map(buildEpg));
    await buildEpgPw();

    console.log(`[TASK] Write important files`);
    mergeTxts();
    mergeSources();
    await writeEpgJsonByDate();
    await writeTvBoxLiveJson(sourceResults);
    updateChannelsJson(sourceResults, epgSources);
    writeReadmePages(sourceResults, epgSources, epgResults);

    console.log(`[TASK] Make custom sources`);
    runCustomTask();
  } catch (err) {
    console.error(err);
  }
})();
