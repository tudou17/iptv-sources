import { describe, expect, it } from 'vitest';

import {
  buildChannelExtinf,
  toStandardName,
  getChannelAttr,
  getChannelLogoUrl,
  getChannelName,
  parseExtinf,
} from '../../src/playlist/extinf';

describe('parseExtinf', () => {
  it('parses duration, attributes and name', () => {
    expect(parseExtinf('#EXTINF:-1 tvg-id="CCTV1" group-title="央视",CCTV-1 综合')).toEqual({
      duration: '-1',
      attrs: { 'tvg-id': 'CCTV1', 'group-title': '央视' },
      name: 'CCTV-1 综合',
    });
  });

  it('splits the name at the first comma and keeps it untrimmed', () => {
    expect(parseExtinf('#EXTINF:-1, A, B ')?.name).toBe(' A, B ');
  });

  it('ignores commas inside quoted attribute values', () => {
    expect(parseExtinf('#EXTINF:-1 tvg-name="La Red, Chile" group-title="E",red uno')).toEqual({
      duration: '-1',
      attrs: { 'tvg-name': 'La Red, Chile', 'group-title': 'E' },
      name: 'red uno',
    });
  });

  it('falls back to the first comma when quotes are unbalanced', () => {
    expect(parseExtinf('#EXTINF:-1 tvg-name="A,B')?.name).toBe('B');
  });

  it('keeps the first value of duplicated attributes', () => {
    expect(parseExtinf('#EXTINF:-1 a="1" a="2",x')?.attrs).toEqual({ a: '1' });
  });

  it('accepts other durations and rejects non EXTINF lines', () => {
    expect(parseExtinf('#EXTINF:10.5,clip')?.duration).toBe('10.5');
    expect(parseExtinf('##EXTINF:-1,x')).toBeUndefined();
    expect(parseExtinf('#EXTINF:-1 no comma')).toBeUndefined();
  });
});

describe('toStandardName', () => {
  it.each([
    ['102号[768*576]', '102号'],
    ['中山综合.576', '中山综合'],
    ['IPTV法治.', 'IPTV法治'],
    ['CGTN纪录(国际版)', 'CGTN纪录'],
    ['IPTV3＋(轮播)', 'IPTV3＋'],
    ['CCTV-4中文国际（4K）', 'CCTV-4中文国际'],
    ['CCTV4K超高清【4K】', 'CCTV4K超高清'],
    ['求索纪录4K/AC3', '求索纪录4K'],
    ['CCTV13 540', 'CCTV13'],
    ['信号测试1 6M1080', '信号测试1'],
    ['(!!)(箱)音乐欣赏', '音乐欣赏'],
    ['CCTV 4K超高清', 'CCTV 4K超高清'],
    ['CCTV 4K', 'CCTV 4K'],
    ['cctv 4k', 'cctv 4k'],
    ['CCTV 8K', 'CCTV 8K'],
    ['CCTV16 4K', 'CCTV16'],
    ['SiTV欢笑剧场4K 12M2160', 'SiTV欢笑剧场4K'],
    ['北京卫视', '北京卫视'],
  ])('%s -> %s', (name, expected) => {
    expect(toStandardName(name)).toBe(expected);
  });

  it('falls back to the original name when nothing is left', () => {
    expect(toStandardName(' (测试) ')).toBe('(测试)');
  });
});

describe('buildChannelExtinf', () => {
  it('uses the standard name for tvg-id, tvg-name and logo but keeps the display name', () => {
    expect(buildChannelExtinf('中山综合.576', { group: 'G' })).toBe(
      '#EXTINF:-1 tvg-id="中山综合" tvg-name="中山综合" tvg-logo="https://tv-res.pages.dev/logo/中山综合.png" group-title="G",中山综合.576'
    );
  });

  it('strips double quotes from attribute values', () => {
    expect(buildChannelExtinf('A"B', { group: 'G"1' })).toBe(
      '#EXTINF:-1 tvg-id="AB" tvg-name="AB" tvg-logo="https://tv-res.pages.dev/logo/A%22B.png" group-title="G1",A"B'
    );
  });

  it('builds a line that parses back to the same fields', () => {
    expect(parseExtinf(buildChannelExtinf('A', { group: 'G', logo: 'http://l/a.png' }))).toEqual({
      duration: '-1',
      attrs: { 'tvg-id': 'A', 'tvg-name': 'A', 'tvg-logo': 'http://l/a.png', 'group-title': 'G' },
      name: 'A',
    });
  });

  it('fills tvg-id, tvg-name, tvg-logo and group-title', () => {
    expect(buildChannelExtinf('CCTV1', { group: '央视' })).toBe(
      '#EXTINF:-1 tvg-id="CCTV1" tvg-name="CCTV1" tvg-logo="https://tv-res.pages.dev/logo/cctv1.png" group-title="央视",CCTV1'
    );
  });

  it('accepts a custom logo', () => {
    expect(buildChannelExtinf('A', { group: 'G', logo: 'http://logo/a.png' })).toContain(
      'tvg-logo="http://logo/a.png"'
    );
  });
});

describe('channel helpers', () => {
  it('reads name and attributes from a line', () => {
    const line = '#EXTINF:-1 tvg-name="A" group-title="G",Name';
    expect(getChannelName(line)).toBe('Name');
    expect(getChannelAttr(line, 'group-title')).toBe('G');
    expect(getChannelAttr(line, 'tvg-logo')).toBeUndefined();
    expect(getChannelName('not extinf')).toBe('');
  });

  it('lowercases CCTV in logo urls', () => {
    expect(getChannelLogoUrl('CCTV5+')).toBe('https://tv-res.pages.dev/logo/cctv5+.png');
  });

  it('encodes unsafe characters in logo urls but keeps Chinese', () => {
    expect(getChannelLogoUrl('凤凰 中文#1/HD?')).toBe(
      'https://tv-res.pages.dev/logo/凤凰%20中文%231%2FHD%3F.png'
    );
  });
});
