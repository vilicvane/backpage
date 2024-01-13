import type {ReactNode} from 'react';
import React from 'react';
import {createRoot} from 'react-dom/client';

import {window} from './@jsdom.js';
import {BackPageContext} from './components/index.js';
import type {
  Tunnel,
  TunnelNotification,
  TunnelNotifyOptions,
} from './tunnel.js';
import type {FrontPageTunnelOptions} from './tunnels/index.js';
import {FrontPageTunnel} from './tunnels/index.js';

const NOTIFY_TIMEOUT_DEFAULT = 30_000;

export type BackPageOptions = FrontPageTunnelOptions & {
  title?: string;
  notify?: Partial<TunnelNotifyOptions> & {
    fallback?: (
      notification: TunnelNotification,
    ) => BackPageFallbackRequest | string | void;
  };
};

export class BackPage {
  private tunnel: Tunnel;

  private content = window.document.createElement('div');

  private root = createRoot(this.content);

  private mutationObserver: MutationObserver;

  private notifyOptions: TunnelNotifyOptions;

  constructor({
    title,
    notify: notifyOptions,
    ...options
  }: BackPageOptions = {}) {
    this.notifyOptions = notifyOptions
      ? {
          timeout: notifyOptions.timeout ?? NOTIFY_TIMEOUT_DEFAULT,
        }
      : {
          timeout: false,
        };

    this.tunnel = new FrontPageTunnel(options);

    const notifyFallback = notifyOptions?.fallback;

    if (notifyFallback) {
      this.tunnel.onNotifyTimeout(notification => {
        let request = notifyFallback(notification);

        if (request === undefined) {
          return;
        }

        if (typeof request === 'string') {
          request = {url: request, options: undefined};
        }

        void fetch(request.url, request.options);
      });
    }

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

  notify(
    notification: TunnelNotification | string,
    options: BackPageNotifyOptions = {},
  ): void {
    notification =
      typeof notification === 'string' ? {title: notification} : notification;

    this.tunnel.notify(notification, {
      ...this.notifyOptions,
      ...options,
    });
  }

  private updateHTML(): void {
    this.tunnel.update({
      content: this.content.cloneNode(true) as HTMLDivElement,
    });
  }
}

export type BackPageFallbackRequest = {
  url: string;
  options?: RequestInit;
};

export type BackPageUpdate = {
  title?: string;
};

export type BackPageNotifyOptions = {
  timeout?: false;
};
