import type {FormHTMLAttributes, ReactElement} from 'react';
import React, {useContext, useEffect, useState} from 'react';

import type {ActionCallback} from '../action.js';
import {RELATIVE_ACTION_PATH} from '../action.js';

import {BackPageContext} from './backpage-context.js';

let lastImplicitActionNameSuffixNumber = 0;

export type FormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'method' | 'action' | 'target'
> & {
  action: ActionCallback;
};

export function Form({action, ...props}: FormProps): ReactElement {
  const context = useContext(BackPageContext);

  const [name] = useState(
    () => props.name ?? `action-${++lastImplicitActionNameSuffixNumber}`,
  );

  useEffect(
    () => context.registerAction(name, action),
    [action, context, name],
  );

  const target = `${name}_target-iframe`;

  return (
    <>
      <iframe name={target} style={{display: 'none'}} />
      <form
        target={target}
        method="POST"
        action={RELATIVE_ACTION_PATH(name)}
        {...props}
      />
    </>
  );
}
