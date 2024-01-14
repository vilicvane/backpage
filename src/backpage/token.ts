import {randomUUID} from 'crypto';
import {mkdir, readFile, writeFile} from 'fs/promises';
import {dirname} from 'path';

export async function getPersistentToken(
  path = '.backpage/uuid',
): Promise<string> {
  let uuid = await readFile(path, 'utf8').then(
    text => text.trim(),
    () => undefined,
  );

  if (!uuid) {
    uuid = randomUUID();

    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, uuid);
  }

  return uuid;
}
