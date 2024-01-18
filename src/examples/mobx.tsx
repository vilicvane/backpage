import {action} from 'mobx';
import {observer, useLocalObservable} from 'mobx-react';
import type {ReactElement} from 'react';
import React, {useEffect} from 'react';

import {BackPage} from 'backpage';

const page = new BackPage();

const App = observer((): ReactElement => {
  const state = useLocalObservable(() => {
    return {
      count: 0,
    };
  });

  useEffect(() => {
    const timer = setInterval(
      action(() => {
        state.count++;
      }),
      1000,
    );

    return () => clearInterval(timer);
  }, [state.count]);

  return (
    <>
      <h1>Hello BackPage!</h1>
      <p>Count: {state.count}</p>
    </>
  );
});

page.render(<App />);

page.guide();
