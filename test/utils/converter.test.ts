import { describe, expect, it } from 'vitest';

import { converter } from '../../src/utils/converter';

describe('converter', () => {
  it('converts traditional Chinese to simplified', () => {
    expect(converter('鳳凰資訊 綜合')).toBe('凤凰资讯 综合');
  });

  it('keeps protected words', () => {
    expect(converter('吉林乾安綜合 乾安')).toBe('吉林乾安综合 乾安');
  });
});
