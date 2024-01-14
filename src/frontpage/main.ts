import DiffMatchPatch from 'diff-match-patch';
import morphdom from 'morphdom';

import type {
  BackFrontMessage,
  BackFrontNotifyMessage,
  BackFrontUpdateMessage,
  FrontBackMessage,
} from '../shared/index.js';

// Using string replace also handles the case of HTTPS.
const WS_URL = location.href.replace(/^http/, 'ws');

const INITIAL_CONNECT_DELAY = 1000;

const RECONNECT_INTERVAL = 1000;

const INITIAL_BODY = document.body.cloneNode(true);

const dmp = new DiffMatchPatch();

let pendingNotifications = 0;

let latestTitle = document.title;

let latestHTML: string | undefined;

document.addEventListener('visibilitychange', () => updateTitle());

setTimeout(() => connect(), INITIAL_CONNECT_DELAY);

function connect(): void {
  const ws = new WebSocket(WS_URL);

  ws.addEventListener('message', ({data}) => {
    const message = JSON.parse(data) as BackFrontMessage;

    switch (message.type) {
      case 'update':
        update(message);
        break;
      case 'notify':
        void notify(message);
        break;
    }
  });

  ws.addEventListener('close', () => {
    setTimeout(connect, RECONNECT_INTERVAL);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });

  function update({title, content}: BackFrontUpdateMessage): void {
    if (title !== undefined) {
      latestTitle = title;

      updateTitle();
    }

    if (typeof content === 'string') {
      latestHTML = content;

      if (latestHTML === '') {
        document.body.replaceWith(INITIAL_BODY.cloneNode(true));
      } else {
        document.body.innerHTML = latestHTML;
      }
    } else if (latestHTML !== undefined) {
      [latestHTML] = dmp.patch_apply(content, latestHTML);

      const body = document.createElement('body');

      body.innerHTML = latestHTML;

      morphdom(document.body, body, {
        getNodeKey: node => {
          if (node instanceof HTMLElement) {
            return node.id ?? node.dataset.key ?? undefined;
          } else {
            return undefined;
          }
        },
      });
    } else {
      document.body.innerHTML = 'An error occurred.';
    }
  }

  async function notify({
    id,
    title,
    body,
  }: BackFrontNotifyMessage): Promise<void> {
    pendingNotifications++;

    updateTitle();

    switch (Notification.permission) {
      case 'granted':
        break;
      case 'denied':
        return;
      case 'default':
        if ((await Notification.requestPermission()) !== 'granted') {
          return;
        } else {
          break;
        }
    }

    const notification = new Notification(title, {body});

    notification.addEventListener('click', () => {
      window.focus();
      notified();
    });
    notification.addEventListener('close', notified);

    function notified(): void {
      send({type: 'notified', id});
    }
  }

  function send(message: FrontBackMessage): void {
    if (ws.readyState !== ws.OPEN) {
      return;
    }

    ws.send(JSON.stringify(message));
  }
}

function updateTitle(): void {
  if (document.visibilityState === 'visible') {
    pendingNotifications = 0;
  }

  const title =
    pendingNotifications > 0
      ? `(${pendingNotifications}) ${latestTitle}`
      : latestTitle;

  if (document.title !== title) {
    document.title = title;
  }
}
