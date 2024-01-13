import DiffMatchPatch from 'diff-match-patch';
import morphdom from 'morphdom';

import type {BackFrontMessage} from '../shared/index.js';

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
          document.title = message.title;

          if (typeof message.content === 'string') {
            html = message.content;

            document.body.innerHTML = html;
          } else if (html !== undefined) {
            [html] = dmp.patch_apply(message.content, html);

            const body = document.createElement('body');

            body.innerHTML = html;

            morphdom(document.body, body);
          } else {
            document.body.innerHTML = 'An error occurred.';
          }

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
}
