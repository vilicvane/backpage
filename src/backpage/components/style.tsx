import {readFile, watch} from 'fs/promises';

import type {ReactElement} from 'react';
import React, {useEffect} from 'react';

export type StyleProps = {
  src: string;
};

export function Style({src}: StyleProps): ReactElement {
  const [content, setContent] = React.useState('');

  useEffect(() => {
    const ac = new AbortController();

    const watcher = watch(src, {signal: ac.signal});

    void (async () => {
      await readSetContent(src);

      for await (const _event of watcher) {
        await readSetContent(src);
      }
    })().catch(error => {
      if (error.name === 'AbortError') {
        return;
      }

      throw error;
    });

    return () => ac.abort();
  }, [src]);

  return <style>{content}</style>;

  async function readSetContent(src: string): Promise<void> {
    await readFile(src, 'utf8').then(setContent);
  }
}
