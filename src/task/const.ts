import path from 'path';

import { projectRoot } from '../file';

export const configPath = path.join(projectRoot, 'config');

export const configCustomPath = path.join(configPath, 'custom');

export const m3uPath = path.join(projectRoot, 'm3u');

export const writeCustomPath = path.join(m3uPath, 'custom');
