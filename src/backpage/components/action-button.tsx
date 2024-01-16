import type {ButtonHTMLAttributes, ReactElement} from 'react';
import React from 'react';

import type {ActionCallback} from '../action.js';

import type {FormProps} from './form.js';
import {Form} from './form.js';

export type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> & {
  action: ActionCallback;
  formProps?: Omit<FormProps<{}>, 'action'>;
};

export function ActionButton({
  action,
  formProps,
  ...props
}: ActionButtonProps): ReactElement {
  return (
    <Form action={action} {...formProps}>
      <button type="submit" {...props} />
    </Form>
  );
}
