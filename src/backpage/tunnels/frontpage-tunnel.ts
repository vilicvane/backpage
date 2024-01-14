import type {Server} from 'http';
import {createServer} from 'http';
import type {AddressInfo} from 'net';

import Express from 'express';
import ExpressWS from 'express-ws';
import type {WebSocket} from 'ws';

import type {BackFrontMessage, FrontBackMessage} from '../../shared/index.js';
import {
  FRONTPAGE_BUNDLED_PATH,
  FRONTPAGE_INDEX_PATH,
  FRONTPAGE_RES_DIR,
} from '../paths.js';
import {Tunnel, TunnelClient} from '../tunnel.js';

const HOST_DEFAULT = 'localhost';
const PORT_DEFAULT = 12368;

export type FrontPageTunnelOptions = {host?: string; port?: number};

export class FrontPageTunnel extends Tunnel {
  private server: Server;

  private urlPromise: Promise<string>;

  constructor({
    host = HOST_DEFAULT,
    port = PORT_DEFAULT,
  }: FrontPageTunnelOptions) {
    super();

    const express = Express();

    const server = createServer(express);

    const {app} = ExpressWS(express, server);

    app
      .ws('/', ws => this.addWebSocket(ws))
      .get('/', (_request, response) => response.sendFile(FRONTPAGE_INDEX_PATH))
      .get('/bundled.js', (_request, response) =>
        response.sendFile(FRONTPAGE_BUNDLED_PATH),
      )
      .get('/*', (request, response) =>
        response.sendFile(request.path, {root: FRONTPAGE_RES_DIR}),
      );

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
    const client = new FrontPageTunnelClient(ws);

    this.addClient(client);

    ws.on('close', () => this.removeClient(client));
  }
}

export class FrontPageTunnelClient extends TunnelClient {
  constructor(readonly ws: WebSocket) {
    super();

    ws.on('message', data => {
      const message = JSON.parse(data.toString()) as FrontBackMessage;

      this.emitMessage(message);
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

function getURL({address, port}: AddressInfo): string {
  return `http://${address}:${port}`;
}
