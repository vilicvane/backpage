import type {ReactElement} from 'react';
import React from 'react';

import {BackPage, Console} from 'backpage';

const page = new BackPage();

const App = (): ReactElement => {
  return (
    <>
      <h1>Hello BackPage!</h1>
      <Console />
    </>
  );
};

// POST to `/action/ping` to trigger this action.

page.registerAction('ping', data => {
  console.info('ping', data);
});

page.render(<App />);

page.guide();
