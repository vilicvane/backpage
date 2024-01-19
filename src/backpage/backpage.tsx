import {createRequire} from 'module';

import Chalk from 'chalk';
import {toPlain} from 'plain-dom';
import type {ReactNode} from 'react';
import React from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';

import {
  type FrontBackEvent,
  PAGE_EVENT_TARGET_ID_KEY,
} from '../shared/index.js';

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

const EVENTS_DEFAULT = ['click', 'input'];

export type BackPageNotifyFallback = (
  notification: TunnelNotification,
) => BackPageFallbackRequest | string | void;

export type BackPageOptions = (FrontPageTunnelOptions | CloudTunnelOptions) & {
  title?: string;
  notify?: Partial<TunnelNotifyOptions> & {
    fallback?: BackPageNotifyFallback;
  };
  events?: string[];
};

export class BackPage {
  private tunnel: Tunnel;

  private content: HTMLElement;

  private root: Root;

  private mutationObserver: MutationObserver;

  private notifyOptions: TunnelNotifyOptions;

  constructor({
    title,
    notify: notifyOptions,
    events = EVENTS_DEFAULT,
    ...options
  }: BackPageOptions = {}) {
    this.notifyOptions = notifyOptions
      ? {
          timeout: notifyOptions.timeout ?? NOTIFY_TIMEOUT_DEFAULT,
        }
      : {
          timeout: false,
        };

    this.content = window.document.createElement('div');

    this.root = createRoot(this.content);

    this.tunnel =
      'token' in options
        ? new CloudTunnel(options)
        : new FrontPageTunnel(options);

    const notifyFallback = notifyOptions?.fallback;

    if (notifyFallback) {
      this.tunnel.onNotifyTimeout(notification =>
        this.handleNotifyTimeout(notification, notifyFallback),
      );
    }

    this.tunnel.onEvent(event => this.handleEvent(event));

    this.tunnel.update({
      settings: {
        events,
      },
    });

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

  private lastElementDataId = 0;

  private updateHTML(): void {
    let {content, tunnel} = this;

    for (const element of content.querySelectorAll(
      `:not([${PAGE_EVENT_TARGET_ID_KEY}])`,
    )) {
      element.setAttribute(
        PAGE_EVENT_TARGET_ID_KEY,
        (++this.lastElementDataId).toString(),
      );
    }

    content = content.cloneNode(true) as HTMLDivElement;

    const headStyles = content.ownerDocument.head.getElementsByTagName('style');

    for (const style of headStyles) {
      content.prepend(style.cloneNode(true));
    }

    tunnel.update({
      body: toPlain(content),
    });
  }

  private handleNotifyTimeout(
    notification: TunnelNotification,
    fallback: BackPageNotifyFallback,
  ): void {
    let request = fallback(notification);

    if (request === undefined) {
      return;
    }

    if (typeof request === 'string') {
      request = {url: request, options: undefined};
    }

    void fetch(request.url, request.options);
  }

  private handleEvent({
    constructor: constructorNames,
    type,
    target: targetDataId,
    options,
    effects,
  }: FrontBackEvent): void {
    const target = this.content.querySelector(
      `[${PAGE_EVENT_TARGET_ID_KEY}="${targetDataId}"]`,
    ) as HTMLElement | null;

    if (!target) {
      return;
    }

    let Constructor: typeof Event | undefined;

    for (const name of constructorNames) {
      Constructor = window[name];

      if (!Constructor) {
        continue;
      }

      if (!(Constructor.prototype instanceof window.Event)) {
        return;
      }

      break;
    }

    if (!Constructor) {
      return;
    }

    const event = new Constructor(type, {
      bubbles: true,
      ...options,
    });

    const targetEffects = effects?.target;

    if (targetEffects) {
      for (const [name, value] of Object.entries(targetEffects)) {
        (target as any)[name] = value;
      }
    }

    target.dispatchEvent(event);
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
