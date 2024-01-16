import {WebSocket} from 'ws';

import type {CloudBackMessage} from '../../shared/index.js';
import {Tunnel, WebSocketTunnelClient} from '../tunnel.js';

const ENDPOINT_DEFAULT = 'https://backpage.cloud';
const NAME_DEFAULT = 'default';

const RECONNECT_INTERVAL = 1000;

export type CloudTunnelOptions = {
  endpoint?: string;
  token: string;
  name?: string;
};

export class CloudTunnel extends Tunnel {
  private url: string;

  private wsURL: string;

  private ws: WebSocket | undefined;

  private reconnectTimeout: NodeJS.Timeout | undefined;

  private closed = false;

  constructor({
    endpoint = ENDPOINT_DEFAULT,
    token,
    name = NAME_DEFAULT,
  }: CloudTunnelOptions) {
    super();

    endpoint = endpoint.replace(/\/$/, '');

    const url = `${endpoint}/${token}/${encodeURIComponent(name)}`;

    const urlObject = new URL(url);

    switch (urlObject.protocol) {
      case 'http:':
      case 'https:':
        break;
      default:
        throw new Error(`Invalid endpoint protocol: ${urlObject.protocol}.`);
    }

    this.url = url;
    this.wsURL = `${url.replace(/^http/, 'ws')}/back`;

    this.connect();
  }

  override async getURL(): Promise<string> {
    return this.url;
  }

  override close(): void {
    this.closed = true;

    clearTimeout(this.reconnectTimeout);

    this.ws?.close();
  }

  private connect(): void {
    const ws = new WebSocket(this.wsURL);

    const client = new WebSocketTunnelClient(ws);

    ws.on('message', data => {
      const message = JSON.parse(data.toString()) as CloudBackMessage;

      switch (message.type) {
        case 'online':
          this.addClient(client);
          break;
        case 'offline':
          this.removeClient(client);
          break;
        default:
          this.handleMessage(message);
          break;
      }
    })
      .on('close', () => {
        this.removeClient(client);
        this.scheduleReconnect();
      })
      .on('error', () => ws.close());
  }

  private scheduleReconnect(): void {
    if (this.closed) {
      return;
    }

    clearTimeout(this.reconnectTimeout);

    this.reconnectTimeout = setTimeout(
      () => this.connect(),
      RECONNECT_INTERVAL,
    );
  }
}
