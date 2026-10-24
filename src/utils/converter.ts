import * as OpenCC from 'opencc-js';

const hkToCn = OpenCC.Converter({ from: 'hk', to: 'cn' });

/**
 * 简体中也是正字、但会被 OpenCC 误转的词，转换时原样保留。
 * 如「乾安」（吉林地名）会被转成「干安」。
 */
const PROTECTED_WORDS = ['乾安'];
const PROTECTED_REGEXP = new RegExp(`(${PROTECTED_WORDS.join('|')})`);

/** 繁体（香港）转简体 */
export const converter = (text: string) =>
  text
    .split(PROTECTED_REGEXP)
    .map((part, index) => (index % 2 === 1 ? part : hkToCn(part)))
    .join('');
