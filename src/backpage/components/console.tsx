import AnsiToHTML from 'ansi-to-html';
import patchConsole from 'patch-console';
import type {ReactElement} from 'react';
import React, {useEffect, useState} from 'react';

const LIMIT_DEFAULT = 100;

export type ConsoleProps = {
  limit?: number;
  /**
   * @see https://www.npmjs.com/package/ansi-to-html
   */
  colors?: string[] | Record<number, string>;
};

export function Console({
  limit = LIMIT_DEFAULT,
  colors,
}: ConsoleProps): ReactElement {
  const [recentLines, setRecentLines] = useState<RecentLine[]>([]);

  useEffect(() => {
    const ansiToHTML = new AnsiToHTML(
      // AnsiToHTML seems to have problem with an undefined `colors` option.
      colors ? {colors} : undefined,
    );

    let lastKey = 0;

    const recentLines: RecentLine[] = [];

    return patchConsole((type, data) => {
      process[type].write(data);

      const lastMatchingLine = recentLines.findLast(line => line.type === type);

      if (
        lastMatchingLine !== undefined &&
        !lastMatchingLine.html.endsWith('\n')
      ) {
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
            html: ansiToHTML.toHtml(line),
          };
        }),
      );

      if (recentLines.length > limit) {
        recentLines.splice(0, recentLines.length - limit);
      }

      // Avoid setting state during rendering.
      setImmediate(() => setRecentLines(recentLines.slice()));
    });
  }, [colors, limit]);

  return (
    <pre className="backpage-console">
      {recentLines.map(({key, type, html}) => (
        <div
          key={key}
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
};
