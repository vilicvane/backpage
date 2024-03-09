import type {ButtonHTMLAttributes, ReactElement} from 'react';
import React, {useContext} from 'react';

import {type ActionCallback, RELATIVE_ACTION_PATH} from '../action.js';

import type {FormProps} from './form.js';
import {Form, FormContext, useFormAction} from './form.js';

export type ActionButtonProps<T extends object> = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'formMethod' | 'formAction' | 'formTarget'
> & {
  action: ActionCallback<T>;
  formProps?: Omit<FormProps<T>, 'action'>;
};

export function ActionButton<T extends object>({
  action,
  formProps,
  ...props
}: ActionButtonProps<T>): ReactElement {
  const context = useContext(FormContext);

  if (context) {
    if (formProps) {
      console.warn('ActionButton is inside a form, `formProps` are ignored.');
    }

    return <ActionButtonWithinForm action={action} {...props} />;
  } else {
    return (
      <Form {...formProps}>
        <ActionButtonWithinForm action={action} {...props} />
      </Form>
    );
  }
}

function ActionButtonWithinForm<T extends object>({
  action,
  ...props
}: Omit<ActionButtonProps<T>, 'formProps'>): ReactElement {
  const actionName = useFormAction(props.name, action);

  return (
    <button
      type="submit"
      formAction={RELATIVE_ACTION_PATH(actionName)}
      {...props}
    />
  );
}
