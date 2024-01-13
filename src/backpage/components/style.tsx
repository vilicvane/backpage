import type {ReactElement, StyleHTMLAttributes} from 'react';
import React from 'react';

import {useFileContent} from './@use-file-content.js';

export type StyleProps = StyleHTMLAttributes<HTMLStyleElement> & {
  src: string;
};

export function Style({src, ...attrs}: StyleProps): ReactElement {
  const content = useFileContent(src);

  return <style {...attrs}>{content}</style>;
}
