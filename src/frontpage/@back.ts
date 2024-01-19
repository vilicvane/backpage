import type {BackFrontMessage, FrontBackMessage} from '../shared/index.js';

const RECONNECT_INTERVAL = 1000;

export class Back {
  ws: WebSocket | undefined;

  private onMessageCallbackSet = new Set<BackMessageCallback>();

  constructor(readonly url: string) {}

  connect(): void {
    const ws = new WebSocket(this.url);

    ws.addEventListener('open', () => {
      this.ws = ws;
    });

    ws.addEventListener('message', ({data}) => {
      const message = JSON.parse(data) as BackFrontMessage;
      this.emitMessage(message);
    });

    ws.addEventListener('close', () => {
      this.ws = undefined;
      setTimeout(() => this.connect(), RECONNECT_INTERVAL);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  send(message: FrontBackMessage): void {
    const {ws} = this;

    if (ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(message));
  }

  onMessage(callback: BackMessageCallback): void {
    this.onMessageCallbackSet.add(callback);
  }

  private emitMessage(message: BackFrontMessage): void {
    for (const callback of this.onMessageCallbackSet) {
      callback(message);
    }
  }
}

export type BackMessageCallback = (message: BackFrontMessage) => void;
