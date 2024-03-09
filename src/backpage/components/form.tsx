import type {FormHTMLAttributes, ReactElement} from 'react';
import React, {createContext, useContext, useEffect, useState} from 'react';

import type {ActionCallback} from '../action.js';
import {RELATIVE_ACTION_PATH} from '../action.js';

import {BackPageContext} from './backpage-context.js';

const IFRAME_STYLE = {display: 'none'};

export const FormContext = createContext<boolean>(false);

export type FormProps<T extends object> = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'method' | 'action' | 'target'
> & {
  action?: ActionCallback<T>;
};

export function Form<T extends object>({
  action,
  ...props
}: FormProps<T>): ReactElement;
export function Form({action, ...props}: FormProps<object>): ReactElement {
  const [formTargetName] = useState(() => getFormTargetName());

  const form = action ? (
    <FormWithAction
      formTargetName={formTargetName}
      action={action}
      {...props}
    />
  ) : (
    <FormWithoutAction formTargetName={formTargetName} {...props} />
  );

  return (
    <FormContext.Provider value={true}>
      <iframe name={formTargetName} style={IFRAME_STYLE} />
      {form}
    </FormContext.Provider>
  );
}

function FormWithAction<T extends object>({
  formTargetName,
  action,
  ...props
}: FormProps<T> & {
  formTargetName: string;
  action: ActionCallback<T>;
}): ReactElement {
  const formActionName = useFormAction(props.name, action);

  return (
    <form
      target={formTargetName}
      method="POST"
      action={RELATIVE_ACTION_PATH(formActionName)}
      {...props}
    />
  );
}

function FormWithoutAction({
  formTargetName,
  ...props
}: Omit<FormProps<object>, 'action'> & {
  formTargetName: string;
}): ReactElement {
  return <form target={formTargetName} method="POST" {...props} />;
}

export function useFormAction<T extends object>(
  explicitName: string | undefined,
  action: ActionCallback<T>,
): string {
  const backpage = useContext(BackPageContext);

  const [name] = useState(() => explicitName ?? getImplicitActionName());

  useEffect(
    () => backpage.registerAction(name, action),
    [action, backpage, name],
  );

  return name;
}

let lastFormTargetSuffixNumber = 0;

function getFormTargetName(): string {
  return `form-target-${++lastFormTargetSuffixNumber}`;
}

let lastImplicitActionNameSuffixNumber = 0;

function getImplicitActionName(): string {
  return `action-${++lastImplicitActionNameSuffixNumber}`;
}
