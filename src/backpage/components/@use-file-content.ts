import {readFile, watch} from 'fs/promises';

import {useEffect, useState} from 'react';

export function useFileContent(path: string): string | undefined {
  const [content, setContent] = useState<string>();

  useEffect(() => {
    const ac = new AbortController();

    const watcher = watch(path, {signal: ac.signal});

    void (async () => {
      await readSetContent(path);

      for await (const _event of watcher) {
        await readSetContent(path);
      }
    })().catch(error => {
      if (error.name === 'AbortError') {
        return;
      }

      throw error;
    });

    return () => ac.abort();
  }, [path]);

  return content;

  async function readSetContent(src: string): Promise<void> {
    await readFile(src, 'utf8').then(setContent);
  }
}
