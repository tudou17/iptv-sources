import fs from 'fs';
import path from 'path';

import type { ICustom, ICustomRule, ICustomRuleAppend, ICustomRuleReplacerItem } from './define';
import { configPath, m3uPath, writeCustomPath } from '../const';
import {
  buildChannelExtinf,
  getChannelName,
  type IChannel,
  type IPlaylist,
  m3uToPlaylist,
  playlistToM3u,
  playlistToTxt,
} from '../../playlist';
import { trimAny } from '../../utils';

const loadConfigCustom = (): ICustom | undefined => {
  if (!fs.existsSync(configPath)) {
    return void 0;
  }

  if (fs.readdirSync(configPath).length === 0) {
    return void 0;
  }

  const cfg = JSON.parse(fs.readFileSync(path.join(configPath, 'custom.json'), 'utf-8')) as ICustom;

  // 去除不必要的空格
  cfg.rules = trimAny(cfg.rules);

  return cfg;
};

/** m3u/txt 下的顶层文件名，即可作为 upstream 的源 */
const getFilenames = () => {
  return fs
    .readdirSync(path.join(m3uPath, 'txt'))
    .map((f) => f.replace('.txt', ''))
    .filter((f) => f !== 'channels');
};

const isValidReplacer = (e: ICustomRuleReplacerItem, value: string) => {
  if (e.type === 'regexp') {
    return !!e.pattern && !!e.flags && !!e.target && new RegExp(e.pattern, e.flags).test(value);
  }

  if (e.type === 'string') {
    return !!e.pattern && !!e.target && value.includes(e.pattern);
  }

  return false;
};

/** 只应用第一个命中的替换规则 */
const replaceFirstMatch = (value: string, replacers?: ICustomRuleReplacerItem[]) => {
  if (!Array.isArray(replacers)) return value;

  const replacer = replacers.find((e) => isValidReplacer(e, value));
  if (!replacer) return value;

  return replacer.type === 'regexp'
    ? value.replace(new RegExp(replacer.pattern, replacer.flags), replacer.target)
    : value.replace(replacer.pattern, replacer.target);
};

/** include 的优先级高于 exclude */
const isChannelIncluded = (rule: ICustomRule, name: string) => {
  if (Array.isArray(rule.include)) return rule.include.includes(name);
  if (Array.isArray(rule.exclude)) return !rule.exclude.includes(name);
  return true;
};

const replaceChannel = (rule: ICustomRule, channel: IChannel): IChannel =>
  rule.replacer
    ? {
        extinf: replaceFirstMatch(channel.extinf, rule.replacer.extinf),
        url: replaceFirstMatch(channel.url, rule.replacer.url),
      }
    : channel;

const toAppendedChannel = ({ name, url, extinf }: ICustomRuleAppend): IChannel => {
  if (extinf) return { extinf, url };

  return { extinf: buildChannelExtinf(name.trim(), { group: 'Custom' }), url };
};

/** 依次应用同一 upstream 的所有规则，每条规则的结果拼接在一起 */
export const applyCustomRules = ({ header, channels }: IPlaylist, rules: ICustomRule[]) => ({
  header,
  channels: rules.flatMap((rule) => [
    ...channels
      .filter(({ extinf }) => isChannelIncluded(rule, getChannelName(extinf).trim()))
      .map((channel) => replaceChannel(rule, channel)),
    ...(Array.isArray(rule.append) ? rule.append.map(toAppendedChannel) : []),
  ]),
});

export const runCustomTask = () => {
  const cfg = loadConfigCustom();

  if (!cfg) return;

  if (!cfg.rules || cfg.rules.length === 0) return;

  if (!fs.existsSync(writeCustomPath)) {
    fs.mkdirSync(writeCustomPath);
  }

  getFilenames().forEach((f) => {
    const rules = cfg.rules.filter((r) => r.upstream === f);
    if (rules.length === 0) return;

    console.log(`Customize Source ${f}`);

    const upstream = m3uToPlaylist(fs.readFileSync(path.join(m3uPath, `${f}.m3u`), 'utf-8'));
    const result = applyCustomRules(upstream, rules);

    fs.writeFileSync(path.join(writeCustomPath, `${f}.m3u`), playlistToM3u(result));
    fs.writeFileSync(path.join(writeCustomPath, `${f}.txt`), playlistToTxt(result));
  });
};
