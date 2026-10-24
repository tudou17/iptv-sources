import { describe, expect, it } from 'vitest';

import { updateExtinf } from '../../src/playlist/extinf';
import { cleanChannelName, normalizeChannel } from '../../src/playlist/normalize';

const normalize = (extinf: string) => normalizeChannel({ extinf, url: 'http://a' }).extinf;

describe('cleanChannelName', () => {
  it('removes @@ ids, geo-blocked marks and surrounding spaces', () => {
    expect(cleanChannelName(' CCTV1@@123 [Geo-blocked] [geo-blocked]')).toBe('CCTV1');
  });
});

describe('normalizeChannel', () => {
  it('leaves a complete simplified line untouched', () => {
    const line =
      '#EXTINF:-1 tvg-id="x" tvg-name="北京卫视" tvg-logo="http://logo" group-title="卫视",北京卫视';
    expect(normalize(line)).toBe(line);
  });

  it('cleans and simplifies the name, tvg-name and group-title', () => {
    expect(
      normalize(
        '#EXTINF:-1 tvg-name="臺視@@1" tvg-logo="http://l/臺視.png" group-title="綜合", 臺視@@1'
      )
    ).toBe('#EXTINF:-1 tvg-name="台视" tvg-logo="http://l/臺視.png" group-title="综合",台视');
  });

  it('fills missing or empty attributes', () => {
    expect(normalize('#EXTINF:-1 tvg-logo="",My TV')).toBe(
      '#EXTINF:-1 tvg-logo="https://tv-res.pages.dev/logo/My%20TV.png" tvg-name="My TV" group-title="未分类",My TV'
    );
  });

  it('keeps unquoted attributes and other content', () => {
    expect(normalize('#EXTINF:-1 tvg-shift=8 catchup="append",A')).toBe(
      '#EXTINF:-1 tvg-shift=8 catchup="append" tvg-name="A" tvg-logo="https://tv-res.pages.dev/logo/A.png" group-title="未分类",A'
    );
  });

  it('leaves unparsable lines untouched', () => {
    expect(normalize('#EXTINF:-1 no comma')).toBe('#EXTINF:-1 no comma');
  });
});

describe('updateExtinf', () => {
  it('replaces existing attributes in place and appends new ones', () => {
    expect(
      updateExtinf('#EXTINF:-1 a="1" b="2" ,n', { name: 'm', attrs: { a: '9', c: '3' } })
    ).toBe('#EXTINF:-1 a="9" b="2" c="3" ,m');
  });

  it('strips double quotes from attribute values', () => {
    expect(updateExtinf('#EXTINF:-1,n', { attrs: { a: 'x"y' } })).toBe('#EXTINF:-1 a="xy",n');
  });
});
