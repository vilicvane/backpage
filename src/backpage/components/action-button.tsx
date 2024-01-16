import type {ButtonHTMLAttributes, ReactElement} from 'react';
import React from 'react';

import type {ActionCallback} from '../action.js';

import {Form} from './form.js';

export type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> & {
  action: ActionCallback;
  formClassName?: string;
};

export function ActionButton({
  name,
  action,
  formClassName,
  ...props
}: ActionButtonProps): ReactElement {
  return (
    <Form className={formClassName} name={name} action={action}>
      <button type="submit" {...props} />
    </Form>
  );
}
