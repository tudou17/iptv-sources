import fs from 'fs';
import path from 'path';

import { configPath } from '../const';
import type { IEnv } from './define';
import { trimAny } from '../../utils';

export const loadConfigEnv = (): IEnv | undefined => {
  if (!fs.existsSync(configPath)) {
    return void 0;
  }

  if (fs.readdirSync(configPath).length === 0) {
    return void 0;
  }

  const cfg = trimAny(
    JSON.parse(fs.readFileSync(path.join(configPath, 'env.json'), 'utf-8')) as IEnv
  );

  return cfg;
};
