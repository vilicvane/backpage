import type {ButtonHTMLAttributes, ReactElement} from 'react';
import React from 'react';

import type {ActionCallback} from '../action.js';

import {Form} from './form.js';

export type ActionProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> & {
  name: string;
  action: ActionCallback;
  formClassName?: string;
};

export function Action({
  name,
  action,
  formClassName,
  ...props
}: ActionProps): ReactElement {
  return (
    <Form className={formClassName} name={name} action={action}>
      <button type="submit" {...props} />
    </Form>
  );
}
