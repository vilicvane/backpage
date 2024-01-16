import type {ReactElement} from 'react';
import React, {useEffect, useState} from 'react';

import {BackPage} from 'backpage';

const page = new BackPage();

const App = (): ReactElement => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCount(count => count + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{`
        body {
          background: #f0f0f0;
        }
      `}</style>
      <h1>Hello BackPage!</h1>
      <p>
        Count: <span style={{fontWeight: 'bold'}}>{count}</span>
      </p>
    </>
  );
};

page.render(<App />);

page.guide();
