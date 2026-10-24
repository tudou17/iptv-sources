import { hrtime } from 'process';

import { getContent, writeM3u, writeSources, writeTxt } from '../file';
import { writeChannelList } from '../render';
import { buildSourceOutputs, type ISource, type ISourceOutput } from '../sources';
import { Collector, collectM3uSource } from '../utils';

export interface ISourceOutputSummary {
  filename: string;
  /** undefined 表示拉取失败 */
  channelCount: number | undefined;
  lanProxy?: ISourceOutput['lanProxy'];
}

export interface ISourceBuildResult {
  source: ISource;
  /** 至少一项；失败时只有一项，文件名为 source.filename */
  outputs: ISourceOutputSummary[];
}

const failed = (source: ISource): ISourceBuildResult => {
  console.log(`[WARNING] m3u ${source.name} get failed!`);
  return { source, outputs: [{ filename: source.filename, channelCount: undefined }] };
};

/** 按频道 id 收集所有输出中的播放地址，写入 sources.json */
export const collectSourceUrls = (source: ISource, outputs: ISourceOutput[]) => {
  const collector = Collector(undefined, (v) => !/^([a-z]+):\/\//.test(v));
  if (source.collectSources !== false) {
    for (const output of outputs) {
      for (const { extinf, url } of output.candidates ?? output.playlist.channels) {
        collectM3uSource(extinf, url, collector.collect);
      }
    }
  }
  return collector.result();
};

/** 拉取一个源，写出它的 m3u / txt / sources.json / 频道列表 */
export const buildSource = async (source: ISource): Promise<ISourceBuildResult> => {
  console.log(`[TASK] Fetch ${source.name}`);
  try {
    const [ok, text, now] = await getContent(source);
    if (!ok || !text) {
      return failed(source);
    }

    console.log(
      `Fetch m3u from ${source.name} finished, cost ${
        (parseInt(hrtime.bigint().toString()) - parseInt(now.toString())) / 10e6
      } ms`
    );

    const outputs = buildSourceOutputs(source, text);
    const collected = collectSourceUrls(source, outputs);

    await Promise.all(
      outputs.map(async ({ filename, playlist }) => {
        await writeM3u(filename, playlist);
        await writeTxt(filename, playlist);
        await writeSources(source.name, filename, collected);
        writeChannelList(source.name, filename, playlist.channels);
      })
    );

    return {
      source,
      outputs: outputs.map(({ filename, playlist, lanProxy }) => ({
        filename,
        channelCount: playlist.channels.length,
        lanProxy,
      })),
    };
  } catch (e) {
    console.log(e);
    return failed(source);
  }
};
