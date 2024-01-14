import {WebSocket} from 'ws';

import type {BackFrontMessage, CloudBackMessage} from '../../shared/index.js';
import {Tunnel, TunnelClient} from '../tunnel.js';

const ENDPOINT_DEFAULT = 'https://backpage.cloud';

const RECONNECT_INTERVAL = 1000;

export type CloudTunnelOptions = {
  endpoint?: string;
  token: string;
  name: string;
};

export class CloudTunnel extends Tunnel {
  private url: string;

  private wsURL: string;

  private ws: WebSocket | undefined;

  private reconnectTimeout: NodeJS.Timeout | undefined;

  private closed = false;

  constructor({endpoint = ENDPOINT_DEFAULT, token, name}: CloudTunnelOptions) {
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

    const client = new CloudTunnelClient(ws, online => {
      if (online) {
        this.addClient(client);
      } else {
        this.removeClient(client);
      }
    });

    ws.on('close', () => {
      this.removeClient(client);
      this.scheduleReconnect();
    }).on('error', () => ws.close());
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

export class CloudTunnelClient extends TunnelClient {
  constructor(
    readonly ws: WebSocket,
    statusChangeCallback: (online: boolean) => void,
  ) {
    super();

    ws.on('message', data => {
      const message = JSON.parse(data.toString()) as CloudBackMessage;

      switch (message.type) {
        case 'online':
          statusChangeCallback(true);
          break;
        case 'offline':
          statusChangeCallback(false);
          break;
        default:
          this.emitMessage(message);
          break;
      }
    });
  }

  override async send(message: BackFrontMessage): Promise<void> {
    const {ws} = this;

    if (ws.readyState !== ws.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      ws.send(JSON.stringify(message), error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
