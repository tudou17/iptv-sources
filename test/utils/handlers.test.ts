import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getCustomUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults when env is unset', async () => {
    vi.stubEnv('CUSTOM_URL', '');
    vi.stubEnv('CF_PAGES_URL', '');
    const { getCustomUrl } = await import('../../src/utils/handlers');
    expect(getCustomUrl()).toBe('https://m3u.ibert.me');
  });

  it('prefers CUSTOM_URL over CF_PAGES_URL', async () => {
    vi.stubEnv('CUSTOM_URL', 'https://a.example.com');
    vi.stubEnv('CF_PAGES_URL', 'https://b.pages.dev');
    const { getCustomUrl } = await import('../../src/utils/handlers');
    expect(getCustomUrl()).toBe('https://a.example.com');
  });

  it('normalizes Cloudflare Pages preview host to production', async () => {
    vi.stubEnv('CUSTOM_URL', '');
    vi.stubEnv('CF_PAGES_URL', 'https://feature-1.myproj.pages.dev');
    const { getCustomUrl } = await import('../../src/utils/handlers');
    expect(getCustomUrl()).toBe('https://myproj.pages.dev');
  });

  it('strips trailing slashes from resolved base', async () => {
    vi.stubEnv('CUSTOM_URL', 'https://cdn.example.com/');
    vi.stubEnv('CF_PAGES_URL', '');
    const { getCustomUrl } = await import('../../src/utils/handlers');
    expect(getCustomUrl()).toBe('https://cdn.example.com');
  });
});
