import type {ReactElement} from 'react';
import React, {useEffect, useState} from 'react';

import {BackPage} from 'backpage';

// For ESM project, use dynamic import so styled-components does not detect the
// environment before we inject `window` and `document`.
const {css, styled} = await import('styled-components');

// `createGlobalStyle` still not working, so we use `css` instead.
const globalCSS = css`
  body {
    background: #f0f0f0;
  }
`;

const Paragraph = styled.p`
  color: #666;
`;

const Count = styled.span`
  font-weight: bold;
`;

const page = new BackPage();

const App = (): ReactElement => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCount(count => count + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{globalCSS.toString()}</style>
      <h1>Hello BackPage!</h1>
      <Paragraph>
        Count: <Count>{count}</Count>
      </Paragraph>
    </>
  );
};

page.render(<App />);

page.guide();
