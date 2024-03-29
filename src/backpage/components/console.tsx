import {randomBytes} from 'crypto';

import AnsiToHTML from 'ansi-to-html';
import patchConsole from 'patch-console';
import type {HTMLAttributes, ReactElement} from 'react';
import React, {useEffect, useState} from 'react';

const LIMIT_DEFAULT = 100;

let consolePatched = false;

export type ConsoleProps = HTMLAttributes<HTMLPreElement> & {
  limit?: number;
  /**
   * @see https://www.npmjs.com/package/ansi-to-html
   */
  colors?: string[] | Record<number, string>;
};

export function Console({
  limit = LIMIT_DEFAULT,
  colors,
  ...attrs
}: ConsoleProps): ReactElement {
  const [idPrefix] = useState(
    () => `console-${randomBytes(2).toString('hex')}:`,
  );

  const [recentLines, setRecentLines] = useState<RecentLine[]>([]);

  useEffect(() => {
    if (consolePatched) {
      throw new Error(
        'Console already patched, are you using multiple <Console /> component?',
      );
    }

    consolePatched = true;

    const ansiToHTML = new AnsiToHTML(
      // AnsiToHTML seems to have problem with an undefined `colors` option.
      colors ? {colors} : undefined,
    );

    let lastKey = 0;

    const recentLines: RecentLine[] = [];

    const restore = patchConsole((type, data) => {
      process[type].write(data);

      const lastMatchingLine = recentLines.findLast(line => line.type === type);

      if (lastMatchingLine !== undefined && !lastMatchingLine.end) {
        recentLines.pop();
        data = lastMatchingLine.html + data;
      }

      const lines = data.match(/.*\r?\n|.+$/g);

      if (!lines) {
        return;
      }

      recentLines.push(
        ...lines.map(line => {
          return {
            key: ++lastKey,
            type,
            html: ansiToHTML.toHtml(line.replace(/</g, '&lt;')),
            end: line.endsWith('\n'),
          };
        }),
      );

      if (recentLines.length > limit) {
        recentLines.splice(0, recentLines.length - limit);
      }

      // Avoid setting state during rendering.
      setImmediate(() => setRecentLines(recentLines.slice()));
    });

    return () => {
      consolePatched = false;
      restore();
    };
  }, [colors, limit]);

  return (
    <pre {...attrs}>
      {recentLines.map(({key, type, html}) => (
        <div
          key={key}
          data-key={`${idPrefix}${key}`}
          className={type}
          dangerouslySetInnerHTML={{__html: html}}
        />
      ))}
    </pre>
  );
}

type StreamType = 'stdout' | 'stderr';

type RecentLine = {
  key: number;
  type: StreamType;
  html: string;
  end: boolean;
};
