import {dirname, join} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const PROJECT_DIR = join(__dirname, '../..');

export const RES_DIR = join(PROJECT_DIR, 'res');
export const BLD_DIR = join(PROJECT_DIR, 'bld');

export const NODE_MODULES_DIR = join(PROJECT_DIR, 'node_modules');

// frontpage

export const FRONTPAGE_RES_DIR = join(RES_DIR, 'frontpage');

export const FRONTPAGE_BLD_DIR = join(BLD_DIR, 'frontpage');

export const FRONTPAGE_INDEX_PATH = join(FRONTPAGE_RES_DIR, 'index.html');

export const FRONTPAGE_BUNDLED_PATH = join(FRONTPAGE_BLD_DIR, 'bundled.js');
