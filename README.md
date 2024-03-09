[![NPM version](https://img.shields.io/npm/v/backpage?color=%23cb3837&style=flat-square)](https://www.npmjs.com/package/backpage)
[![Repository package.json version](https://img.shields.io/github/package-json/v/vilicvane/backpage?color=%230969da&label=repo&style=flat-square)](./package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-999999?style=flat-square)](./LICENSE)
[![Discord](https://img.shields.io/badge/chat-discord-5662f6?style=flat-square)](https://discord.gg/wEVn2qcf8h)

# BackPage <!-- omit in toc -->

Naive static HTML streaming based on React for Node.js CLI applications.

## How does it work? <!-- omit in toc -->

BackPage renders your React application to HTML and streams updates (**static** HTML snapshots) to your browser.

It is designed for really simple GUI as a complementary to text logs, so **advanced user interaction is neither supported nor its goal.**

## Features <!-- omit in toc -->

- Stream static HTML from React rendering.
- Send notification to browser.
- Simple user interaction with HTML form.
- Simple webhook usages with `/action/[action-name]` and `/notify` endpoints.
- Public URL via [backpage.cloud](https://backpage.cloud).

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Form-based Interaction](#form-based-interaction)
- [Events](#events)
  - [click](#click)
  - [input](#input)
- [Browser Notification](#browser-notification)
- [Public URL](#public-url)
- [Examples](#examples)
- [Built-in Components](#built-in-components)
  - [Form](#form)
  - [ActionButton](#actionbutton)
  - [Title](#title)
  - [Style](#style)
  - [Console](#console)

## Installation

```bash
npm install react backpage
```

## Basic Usage

**main.tsx**

```tsx
import {BackPage} from 'backpage';
import React from 'react';

import {App} from './app.js';

const page = new BackPage();

page.render(<App />);

// Print page information including URL.
page.guide();
```

**app.tsx**

```tsx
import React, {useState, useEffect} from 'react';

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

## Form-based Interaction

See [Form](#form) and [ActionButton](#actionbutton) for simple usage.

## Events

BackPage can proxy explicitly specified events that bubble to `document` from the browser to your Node.js React application.

```tsx
const page = new BackPage({
  events: ['click'],
});

page.render(
  <div
    onClick={() => {
      console.info('This will work.');
    }}
  >
    Click me!
  </div>,
);
```

> Events are proxied asynchronously, and just for the purpose of triggering actions in your Node.js application.

> Not all events bubble, please checkout relevant documents for more information.

### click

Properties:

- `altKey`
- `ctrlKey`
- `metaKey`
- `shiftKey`

### input

Effects:

- Sets `event.target.value` to the value of the input element.

## Browser Notification

To send notification to the browser using `page.notify()`:

```ts
page.notify('Hello BackPage!');

page.notify({
  title: 'Hello BackPage!',
  body: 'This is a notification from BackPage.',
});
```

You can also setup a fallback for notifications not getting **clicked** within the timeout:

```ts
const page = new BackPage({
  notify: {
    // timeout: 30_000,
    fallback: notification => {
      // Handle the notification manually.

      // Optionally return a webhook URL or request options to initiate an HTTP
      // request.
      return 'https://some.webhook/';
    },
  },
});

page.notify({
  title: 'Hello BackPage!',
  body: 'Click me or your webhook will get fired!',
});
```

## Public URL

By specifying a UUID as token, you can get a public URL from [backpage.cloud](https://backpage.cloud):

```ts
import {BackPage, getPersistentToken} from 'backpage';

const page = new BackPage({
  // You can also use any random UUID for temporary page.
  token: getPersistentToken(),
  // Different pages can be setup using the same token with different names.
  // name: 'project-name',
});

page.guide();
```

> **Note:** [backpage.cloud](https://backpage.cloud) may introduce value-added services for significant network traffic to cover the expense in the future.

## Examples

Check out [src/examples](./src/examples).

## Built-in Components

### Form

A `Form` is based on HTML `form` element and has similar usage, except that `action` is proxied backed by `POST` requests and accepts callback with the form data object as its parameter.

```tsx
const action = data => console.info(data);

page.render(
  <Form action={action}>
    <input name="name" />
    <button type="submit">Submit</button>
  </Form>,
);
```

### ActionButton

In many cases, only the button is relevant for an action. `ActionButton` wraps a button within a `Form` for those cases:

```tsx
const action = () => console.info('Launch!');

page.render(<ActionButton action={action}>Launch</ActionButton>);
```

You can also put multiple `ActionButton`s in an explicit `Form` to share the form inputs:

```tsx
const actionA = data => console.info('action-a', data);
const actionB = data => console.info('action-b', data);

page.render(
  <Form>
    <input name="name" />
    <ActionButton action={actionA}>Action A</ActionButton>
    <ActionButton action={actionB}>Action B</ActionButton>
  </Form>,
);
```

### Title

Sets `document.title` of the page.

```tsx
page.render(
  <>
    <Title>Awesome Page</Title>
    <div>Hello BackPage!</div>
  </>,
);
```

> You can also specify `title` in `BackPage` options if it not dynamic.

### Style

Adds a `style` element to the page with content loaded from `src` (local path).

```tsx
const App = () => (
  <>
    <Style src={STYLE_PATH} />
    <div>Hello BackPage!</div>
  </>
);
```

> You can directly use `<link rel="stylesheet" href="..." />` for CSS links.

### Console

Intercepts console outputs using [patch-console](https://www.npmjs.com/package/patch-console).

```tsx
const App = () => (
  <>
    <h2>Logs</h2>
    <Console />
  </>
);
```

## License <!-- omit in toc -->

MIT License.
