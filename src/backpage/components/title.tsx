import {useContext, useEffect} from 'react';

import {BackPageContext} from './backpage-context.js';

export type TitleProps = {
  children: string | number | Iterable<string | number>;
};

export function Title({children}: TitleProps): null {
  const context = useContext(BackPageContext);

  let content: string;

  switch (typeof children) {
    case 'string':
      content = children;
      break;
    case 'number':
      content = String(children);
      break;
    default:
      content = Array.from(children).join('');
      break;
  }

  useEffect(() => {
    context.update({title: content});
  }, [content, context]);

  return null;
}
