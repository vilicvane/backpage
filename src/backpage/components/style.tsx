import type {HTMLAttributes, ReactElement} from 'react';
import React from 'react';

import {useFileContent} from './@use-file-content.js';

export type StyleProps = HTMLAttributes<HTMLStyleElement> & {
  src: string;
};

export function Style({src, ...attrs}: StyleProps): ReactElement {
  const content = useFileContent(src);

  return <style {...attrs}>{content}</style>;
}
