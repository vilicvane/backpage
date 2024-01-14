import {randomUUID} from 'crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'fs';
import {dirname} from 'path';

export function getPersistentToken(path = '.backpage/uuid'): string {
  let uuid: string | undefined;

  try {
    uuid = readFileSync(path, 'utf8').trim();
  } catch {
    // ignore
  }

  if (!uuid) {
    uuid = randomUUID();

    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, uuid);
  }

  return uuid;
}
