import type {FormHTMLAttributes, ReactElement} from 'react';
import React, {useContext, useEffect} from 'react';

import type {ActionCallback} from '../action.js';
import {RELATIVE_ACTION_PATH} from '../action.js';

import {BackPageContext} from './backpage-context.js';

export type FormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'name' | 'method' | 'action' | 'target'
> & {
  name: string;
  action: ActionCallback;
};

export function Form({name, action, ...props}: FormProps): ReactElement {
  const context = useContext(BackPageContext);

  useEffect(
    () => context.registerAction(name, action),
    [action, context, name],
  );

  const target = `${name}_target-iframe`;

  return (
    <>
      <iframe name={target} style={{display: 'none'}} />
      <form
        name={name}
        target={target}
        method="POST"
        action={RELATIVE_ACTION_PATH(name)}
        {...props}
      />
    </>
  );
}
