import DiffMatchPatch from 'diff-match-patch';
import morphdom from 'morphdom';

import type {
  BackFrontMessage,
  BackFrontNotifyMessage,
  BackFrontUpdateMessage,
  FrontBackMessage,
} from '../shared/index.js';

// Using string replace also handles the case of HTTPS.
const WS_URL = new URL('/', location.href).href.replace(/^http/, 'ws');

const RECONNECT_INTERVAL = 1000;

const dmp = new DiffMatchPatch();

let html: string | undefined;

connect();

function connect(): void {
  const ws = new WebSocket(WS_URL);

  ws.addEventListener('message', ({data}) => {
    if (typeof data === 'string') {
      const message = JSON.parse(data) as BackFrontMessage;

      switch (message.type) {
        case 'update':
          update(message);
          break;
        case 'notify':
          void notify(message);
          break;
      }
    }
  });

  ws.addEventListener('close', () => {
    setTimeout(connect, RECONNECT_INTERVAL);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });

  function update({title, content}: BackFrontUpdateMessage): void {
    document.title = title;

    if (typeof content === 'string') {
      html = content;

      document.body.innerHTML = html;
    } else if (html !== undefined) {
      [html] = dmp.patch_apply(content, html);

      const body = document.createElement('body');

      body.innerHTML = html;

      morphdom(document.body, body);
    } else {
      document.body.innerHTML = 'An error occurred.';
    }
  }

  async function notify({
    id,
    title,
    body,
  }: BackFrontNotifyMessage): Promise<void> {
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
