import type {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';

import type {Tunnel} from './tunnel.js';
import {SelfHostedTunnel} from './tunnels/index.js';

export type BackPageOptions = {};

export class BackPage {
  private tunnel: Tunnel;

  private container = document.createElement('div');

  private root = createRoot(this.container);

  private mutationObserver: MutationObserver;

  constructor({}: BackPageOptions) {
    this.tunnel = new SelfHostedTunnel();

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

  render(node: ReactNode): void {
    this.root.render(node);
  }

  unmount(): void {
    this.mutationObserver.disconnect();
    this.root.unmount();
  }

  private updateHTML(): void {
    const html = this.container.innerHTML;
    this.tunnel.update(html);
  }
}
