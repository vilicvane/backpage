import morphdom from 'morphdom';
import {toDOM} from 'plain-dom';

import {
  type BackFrontMessage,
  type BackFrontNotifyMessage,
  type BackFrontUpdateMessage,
  type FrontBackMessage,
  type PageSnapshot,
  patchPageSnapshotInPlace,
} from '../shared/index.js';

// Using string replace also handles the case of HTTPS.
const WS_URL = `${location.protocol.replace(/^http/, 'ws')}//${location.host}${location.pathname}`;

const INITIAL_CONNECT_DELAY = 1000;

const RECONNECT_INTERVAL = 1000;

const INITIAL_BODY = document.body.cloneNode(true);

let originalTitle = document.title;

let pendingNotifications = 0;

let snapshot: PageSnapshot | undefined;

document.addEventListener('visibilitychange', () => {
  if (snapshot) {
    updateTitle(snapshot.title);
  }
});

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

  function update({content}: BackFrontUpdateMessage): void {
    if (content) {
      switch (content.type) {
        case 'snapshot':
          snapshot = content.snapshot;
          break;
        case 'delta':
          if (!snapshot) {
            throw new Error('Should not receive delta without snapshot.');
          }

          patchPageSnapshotInPlace(snapshot, content.delta);

          break;
      }
    } else {
      snapshot = undefined;
    }

    if (snapshot) {
      updateTitle(snapshot.title);

      morphdom(document.body, toDOM(snapshot.body), {
        getNodeKey(node) {
          if (node instanceof HTMLElement) {
            return node.id ?? node.dataset.key ?? undefined;
          } else {
            return undefined;
          }
        },
        // https://github.com/patrick-steele-idem/morphdom?tab=readme-ov-file#can-i-make-morphdom-blaze-through-the-dom-tree-even-faster-yes
        onBeforeElUpdated(from, to) {
          if (
            (from instanceof HTMLInputElement &&
              to instanceof HTMLInputElement) ||
            (from instanceof HTMLTextAreaElement &&
              to instanceof HTMLTextAreaElement) ||
            (from instanceof HTMLSelectElement &&
              to instanceof HTMLSelectElement)
          ) {
            to.value = from.value;
          }

          return !from.isEqualNode(to);
        },
        childrenOnly: true,
      });
    } else {
      snapshot = undefined;
      document.body.replaceWith(INITIAL_BODY.cloneNode(true));
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

function updateTitle(newTitle?: string): void {
  if (newTitle !== undefined) {
    originalTitle = newTitle;
  }

  if (document.visibilityState === 'visible') {
    pendingNotifications = 0;
  }

  const title =
    pendingNotifications > 0
      ? `(${pendingNotifications}) ${originalTitle}`
      : originalTitle;

  if (document.title !== title) {
    document.title = title;
  }
}
