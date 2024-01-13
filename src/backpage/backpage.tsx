import type {ReactNode} from 'react';
import React from 'react';
import {createRoot} from 'react-dom/client';

import {window} from './@jsdom.js';
import {BackPageContext} from './components/index.js';
import type {Tunnel} from './tunnel.js';
import type {FrontPageTunnelOptions} from './tunnels/index.js';
import {FrontPageTunnel} from './tunnels/index.js';

export type BackPageOptions = FrontPageTunnelOptions & {
  title?: string;
};

export class BackPage {
  private tunnel: Tunnel;

  private content = window.document.createElement('div');

  private root = createRoot(this.content);

  private mutationObserver: MutationObserver;

  constructor({title, ...options}: BackPageOptions = {}) {
    this.tunnel = new FrontPageTunnel(options);

    if (title !== undefined) {
      this.tunnel.update({title});
    }

    this.mutationObserver = new window.MutationObserver(() =>
      this.updateHTML(),
    );

    this.mutationObserver.observe(this.content, {
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

    console.info(url);
  }

  render(node: ReactNode): void {
    this.root.render(
      <BackPageContext.Provider value={this}>{node}</BackPageContext.Provider>,
    );
  }

  unmount(): void {
    this.mutationObserver.disconnect();
    this.root.unmount();
    this.tunnel.close();
  }

  update(update: BackPageUpdate): void {
    this.tunnel.update(update);
  }

  private updateHTML(): void {
    this.tunnel.update({
      content: this.content.cloneNode(true) as HTMLDivElement,
    });
  }
}

export type BackPageUpdate = {
  title?: string;
};
