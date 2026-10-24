export interface IEnvSourcesProxyGitHubRawContent {
  close?: boolean;
  custom?: string;
}

export interface IEnvSourcesProxy {
  github_raw_content?: IEnvSourcesProxyGitHubRawContent;
}

export interface IEnvSources {
  proxy?: IEnvSourcesProxy;
}

export interface IEnvExtendsIPTVChecker {
  enable?: boolean;
  url?: string;
}

export interface IEnvExtends {
  iptv_checker?: IEnvExtendsIPTVChecker;
}

export interface IEnv {
  sources?: IEnvSources;
  extends?: IEnvExtends;
}
