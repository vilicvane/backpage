import type {ButtonHTMLAttributes, ReactElement} from 'react';
import React, {useContext} from 'react';

import {type ActionCallback, RELATIVE_ACTION_PATH} from '../action.js';

import type {FormProps} from './form.js';
import {Form, FormContext, useFormAction} from './form.js';

export type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'formMethod' | 'formAction' | 'formTarget'
> & {
  action: ActionCallback;
  formProps?: Omit<FormProps<object>, 'action'>;
};

export function ActionButton({
  action,
  formProps,
  ...props
}: ActionButtonProps): ReactElement {
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

function ActionButtonWithinForm({
  action,
  ...props
}: Omit<ActionButtonProps, 'formProps'>): ReactElement {
  const actionName = useFormAction(props.name, action);

  return (
    <button
      type="submit"
      formAction={RELATIVE_ACTION_PATH(actionName)}
      {...props}
    />
  );
}
