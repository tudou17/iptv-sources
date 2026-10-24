import type { ISourceBuildResult } from '../pipeline/sources';

export const getLanProxyOutputs = ({ outputs }: ISourceBuildResult) =>
  outputs.filter((output) => !!output.lanProxy);

/** 局域网 IP 列表页的文件名（不含 `.more.list` 后缀），没有代理版本时为 undefined */
export const getLanListFilename = (result: ISourceBuildResult) =>
  getLanProxyOutputs(result)[0]?.lanProxy?.baseFilename;

/** 一个源所有局域网代理版本的入口页 */
export const renderLanIpList = (result: ISourceBuildResult) => {
  const links = getLanProxyOutputs(result)
    .map(({ filename, lanProxy }) => `- [${lanProxy!.ipPrefix}.1](/list/${filename}.list)`)
    .join('\n');

  return `# LAN IPs for **${result.source.name}**\n\n${links}\n\nUpdated at **${new Date()}**`;
};
