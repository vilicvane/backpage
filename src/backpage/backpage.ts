import {randomBytes} from 'crypto';

import type {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';

import {window} from './@jsdom.js';
import type {Tunnel} from './tunnel.js';
import type {SelfHostedTunnelOptions} from './tunnels/index.js';
import {SelfHostedTunnel} from './tunnels/index.js';

export type BackPageOptions = SelfHostedTunnelOptions;

export class BackPage {
  private tunnel: Tunnel;

  private container = window.document.createElement('div');

  private root = createRoot(this.container);

  private mutationObserver: MutationObserver;

  constructor(options: BackPageOptions = {}) {
    this.tunnel = new SelfHostedTunnel(options);

    this.mutationObserver = new window.MutationObserver(() =>
      this.updateHTML(),
    );

    this.mutationObserver.observe(this.container, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  getURL(): Promise<string> {
    return this.tunnel.getURL();
  }

  /**
   * Print page URL and possibly other information that guides user to get
   * connected.
   */
  async guide(): Promise<void> {
    const url = await this.getURL();

    console.info(`BackPage: ${url}`);
  }

  render(node: ReactNode): void {
    this.root.render(node);
  }

  unmount(): void {
    this.mutationObserver.disconnect();
    this.root.unmount();
    this.tunnel.close();
  }

  private updateHTML(): void {
    const html = this.container.innerHTML + randomBytes(102400).toString('hex');

    this.tunnel.update(html);
  }
}
