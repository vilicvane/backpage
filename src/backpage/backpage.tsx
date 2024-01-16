import {createRequire} from 'module';

import Chalk from 'chalk';
import {toPlain} from 'plain-dom';
import type {ReactNode} from 'react';
import React from 'react';
import {createRoot} from 'react-dom/client';

import {window} from './@jsdom.js';
import type {ActionCallback} from './action.js';
import {BackPageContext} from './components/index.js';
import type {
  Tunnel,
  TunnelNotification,
  TunnelNotifyOptions,
} from './tunnel.js';
import type {
  CloudTunnelOptions,
  FrontPageTunnelOptions,
} from './tunnels/index.js';
import {CloudTunnel, FrontPageTunnel} from './tunnels/index.js';

const require = createRequire(import.meta.url);

const {version, description} = require('../../package.json');

const NOTIFY_TIMEOUT_DEFAULT = 30_000;

export type BackPageOptions = (FrontPageTunnelOptions | CloudTunnelOptions) & {
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

    this.tunnel =
      'token' in options
        ? new CloudTunnel(options)
        : new FrontPageTunnel(options);

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
  guide(): void {
    void this.getURL().then(url => {
      console.info(`
  ${Chalk.bold('BackPage')} ${Chalk.dim(`v${version}`)}

  ${Chalk.dim(description)}

  🌏 Open ${Chalk.cyan(url)} to visit this page.
`);
    });
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

  registerAction<T extends object>(
    name: string,
    action: ActionCallback<T>,
  ): () => void;
  registerAction(name: string, action: ActionCallback): () => void {
    return this.tunnel.registerAction(name, action);
  }

  private updateHTML(): void {
    const content = this.content.cloneNode(true) as HTMLDivElement;

    const headStyles = content.ownerDocument.head.getElementsByTagName('style');

    for (const style of headStyles) {
      content.prepend(style.cloneNode(true));
    }

    this.tunnel.update({
      body: toPlain(content),
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
