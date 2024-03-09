import type {ReactElement} from 'react';
import React, {useState} from 'react';

import {ActionButton, BackPage, Form} from 'backpage';

const page = new BackPage();

const App = (): ReactElement => {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>Hello BackPage!</h1>
      <p>Count: {count}</p>
      <ActionButton action={() => setCount(count => count + 1)}>
        +1
      </ActionButton>
      <Form>
        <input name="change" type="number" placeholder="Enter a number..." />
        <ActionButton
          action={({change}: {change: number}) =>
            setCount(count => count + (Number(change) || 0))
          }
        >
          +
        </ActionButton>
        <ActionButton
          action={({change}: {change: number}) =>
            setCount(count => count - (Number(change) || 0))
          }
        >
          -
        </ActionButton>
      </Form>
    </>
  );
};

page.render(<App />);

page.guide();
