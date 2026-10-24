import 'dotenv/config';

const DEFAULT_CUSTOM_URL = 'https://m3u.ibert.me';

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, '');
}

/** Cloudflare Pages 预览域 branch.project.pages.dev 规范为生产根 https://project.pages.dev */
function resolveCustomBaseUrl(input: string): string {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return stripTrailingSlashes(trimmed);
  }

  const labels = url.hostname.split('.');
  const isPagesDev =
    labels.length >= 2 &&
    labels[labels.length - 2] === 'pages' &&
    labels[labels.length - 1] === 'dev';

  if (isPagesDev && labels.length === 4) {
    const project = labels[1];
    return stripTrailingSlashes(`https://${project}.pages.dev`);
  }

  return stripTrailingSlashes(url.href);
}

export const getCustomUrl = (): string => {
  const raw =
    process.env.CUSTOM_URL?.trim() || process.env.CF_PAGES_URL?.trim() || DEFAULT_CUSTOM_URL;
  return resolveCustomBaseUrl(raw);
};

export const getGithubRawProxyUrl = () => {
  const custom = process.env.CUSTOM_GITHUB_RAW_SOURCE_PROXY_URL;
  return custom ? custom : `https://ghfast.top`;
};

export const replaceGithubRawProxyUrl = (s: string) => {
  const proxyUrl = getGithubRawProxyUrl();
  return s.replace(
    /tvg-logo="https:\/\/raw\.githubusercontent\.com\//g,
    `tvg-logo="${proxyUrl}/https://raw.githubusercontent.com/`
  );
};

export const isFilteredChannel = (s: string) => {
  if (s.includes('ABN')) {
    return true;
  }

  if (s.includes('NTD')) {
    return true;
  }

  return false;
};
