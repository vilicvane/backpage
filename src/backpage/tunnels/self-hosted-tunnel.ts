import type {Server} from 'http';
import {createServer} from 'http';
import type {AddressInfo} from 'net';

import Express from 'express';
import ExpressWS from 'express-ws';
import type {WebSocket} from 'ws';

import type {BackFrontMessage} from '../../shared/index.js';
import {FRONTPAGE_INDEX_PATH, FRONTPAGE_MAIN_PATH} from '../@paths.js';
import {Tunnel, TunnelClient} from '../tunnel.js';

const PORT_DEFAULT = 12368;

export type SelfHostedTunnelOptions = {host?: string; port?: number};

export class SelfHostedTunnel extends Tunnel {
  private server: Server;

  private urlPromise: Promise<string>;

  constructor({host, port = PORT_DEFAULT}: SelfHostedTunnelOptions) {
    super();

    const express = Express();

    const server = createServer(express);

    const {app} = ExpressWS(express, server);

    app
      .get('/main.js', (_request, response) =>
        response.sendFile(FRONTPAGE_MAIN_PATH),
      )
      .get('/', (_request, response) => response.sendFile(FRONTPAGE_INDEX_PATH))
      .ws('/', ws => this.addWebSocket(ws));

    this.urlPromise = new Promise(resolve => {
      server.listen(port, host, () => {
        const address = server.address() as AddressInfo;
        resolve(getURL(address));
      });
    });

    this.server = server;
  }

  override getURL(): Promise<string> {
    return this.urlPromise;
  }

  override close(): void {
    this.server.close();
  }

  private addWebSocket(ws: WebSocket): void {
    const client = new SelfHostedTunnelClient(ws);

    this.addClient(client);

    ws.on('close', () => this.removeClient(client));
  }
}

export class SelfHostedTunnelClient extends TunnelClient {
  constructor(readonly ws: WebSocket) {
    super();
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

function getURL({address, port}: AddressInfo): string {
  return `http://${address}:${port}`;
}
