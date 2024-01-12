import type {BackFrontMessage} from '../shared/index.js';

// Using string replace also handles the case of HTTPS.
const WS_URL = new URL('/', location.href).href.replace(/^http/, 'ws');

const RECONNECT_INTERVAL = 1000;

connect();

function connect(): void {
  const ws = new WebSocket(WS_URL);

  ws.addEventListener('message', ({data}) => {
    if (typeof data === 'string') {
      const message = JSON.parse(data) as BackFrontMessage;

      switch (message.type) {
        case 'update':
          document.title = message.title;
          document.body.innerHTML = message.html;
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
