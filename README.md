# BackPage

Naive web UI streaming based on React for Node.js CLI applications.

## How does it work?

BackPage renders your React application to HTML and streams updates (**static** HTML snapshots) to your browser.

It is designed for really simple GUI as a complementary to text logs, so **user interaction is neither supported nor its goal.**

## Installation

```bash
npm install backpage
```

## Usage

**main.ts**

```tsx
import {BackPage} from 'backpage';
import React, {useState, useEffect} from 'react';

import {App} from './app.js';

const page = new BackPage();

page.render(<App />);

await page.guide(); // Print connect information.
```

**app.tsx**

```tsx
export const App = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      setCount(count => count + 1),
      1000,
    );

    return () => clearInterval(timer);
  }, []);

  return <div>Count: {count}</div>;
};
```

## Built-in Components

### `<Title />`

Setting the title of the page.

```tsx
page.render(
  <BackPageContext.Provider value={page}>
    <Title>My App</Title>
    <App />
  </BackPageContext.Provider>,
);
```

> `BackPageContext` is required.

## License

MIT License.
