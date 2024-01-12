import type {Server} from 'http';
import {createServer} from 'http';

import {Tunnel} from '../tunnel.js';

export type SelfHostedTunnelOptions = {host?: string; port?: number};

export class SelfHostedTunnel extends Tunnel {
  private server: Server;

  constructor({host, port}: SelfHostedTunnelOptions) {
    super();

    this.server = createServer();
  }

  override update(html: string): void {
    throw new Error('Method not implemented.');
  }
}
