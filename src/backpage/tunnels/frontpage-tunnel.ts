import type {Server} from 'http';
import {createServer} from 'http';
import type {AddressInfo} from 'net';

import Express from 'express';
import ExpressWS from 'express-ws';
import type {WebSocket} from 'ws';

import type {FrontBackMessage} from '../../shared/index.js';
import {ACTION_ROUTE_PATTERN} from '../action.js';
import {
  FRONTPAGE_BUNDLED_PATH,
  FRONTPAGE_INDEX_PATH,
  FRONTPAGE_RES_DIR,
} from '../paths.js';
import {Tunnel, WebSocketTunnelClient} from '../tunnel.js';

const PING_INTERVAL = 5000;

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
      .post(ACTION_ROUTE_PATTERN, Express.urlencoded(), (request, response) => {
        const {actionName} = request.params;
        const data = request.body;

        this.handleMessage({
          type: 'action',
          name: actionName,
          data,
        });

        response.sendStatus(200);
      })
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
    const client = new WebSocketTunnelClient(ws);

    this.addClient(client);

    const pingInterval = setInterval(() => ws.ping(), PING_INTERVAL);

    ws.on('message', data => {
      const message = JSON.parse(data.toString()) as FrontBackMessage;

      this.handleMessage(message);
    })
      .on('close', () => {
        clearInterval(pingInterval);
        this.removeClient(client);
      })
      .on('error', () => ws.close());
  }
}

function getURL({address, port}: AddressInfo): string {
  return `http://${address}:${port}`;
}
