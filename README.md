[![NPM version](https://img.shields.io/npm/v/backpage?color=%23cb3837&style=flat-square)](https://www.npmjs.com/package/backpage)
[![Repository package.json version](https://img.shields.io/github/package-json/v/vilicvane/backpage?color=%230969da&label=repo&style=flat-square)](./package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-999999?style=flat-square)](./LICENSE)
[![Discord](https://img.shields.io/badge/chat-discord-5662f6?style=flat-square)](https://discord.gg/wEVn2qcf8h)

# BackPage

Naive static HTML streaming based on React for Node.js CLI applications.

## How does it work?

BackPage renders your React application to HTML and streams updates (**static** HTML snapshots) to your browser.

It is designed for really simple GUI as a complementary to text logs, so **user interaction is neither supported nor its goal.**

## Features

- Stream static HTML from React rendering.
- Send notification to browser.
- Public URL via [backpage.cloud](https://backpage.cloud).

## Installation

```bash
npm install react backpage
```

## Basic Usage

**main.tsx**

```tsx
import {BackPage} from 'backpage';
import React, {useState, useEffect} from 'react';

import {App} from './app.js';

const page = new BackPage();

page.render(<App />);

// Print page information including URL.
await page.guide();

// Send notification to browser (if connected).
page.notify('Hello BackPage!');
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

You can also use [backpage.cloud](https://backpage.cloud) to get a public URL for your page:

```ts
import {randomUUID} from 'crypto';

const page = new BackPage({
  token: randomUUID(), // Any random UUID would work.
  name: 'project-name',
});

await page.guide();
```

> **Note:** [backpage.cloud](https://backpage.cloud) would probably limit the traffic for free users and introduce paid services in the future.

## Notify Fallback

You can get notified if no browser is connected or the notification is not **clicked** within the timeout.

```ts
const page = new BackPage({
  notify: {
    timeout: 30_000,
    fallback: notification => {
      // Handle the notification manually.

      // You can also return a webhook URL or request options to initiate an
      // HTTP request.
      return 'https://some.webhook/';
    },
  },
});

page.notify('Hello BackPage!');
```

## Built-in Components

### `<Title />`

Setting the title of the page.

```tsx
page.render(
  <>
    <Title>Awesome Page</Title>
    <div>Hello BackPage!</div>
  </>,
);
```

### `<Style />`

Add a `<style />` tag to the page with content loaded from `src`.

```tsx
const App = () => (
  <>
    <Style src={STYLE_PATH} />
    <div>Hello BackPage!</div>
  </>
);
```

### `<Console />`

Intercepts console outputs using [patch-console](https://www.npmjs.com/package/patch-console).

```tsx
const App = () => (
  <>
    <h2>Logs</h2>
    <Console />
  </>
);
```

## License

MIT License.
