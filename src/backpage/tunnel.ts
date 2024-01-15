import {randomUUID} from 'crypto';

import type {PlainNode} from 'plain-dom';

import {
  type BackFrontMessage,
  type FrontBackMessage,
  type FrontBackNotifiedMessage,
  type PageSnapshot,
  getPageUpdateContent,
} from '../shared/index.js';

const INITIAL_TITLE = 'BackPage';

export abstract class Tunnel {
  private clientStateMap = new Map<TunnelClient, ClientState>();

  private snapshot: PageSnapshot | undefined;

  private pendingUpdate: TunnelUpdate | undefined;

  private updateDebounceImmediate: NodeJS.Immediate | undefined;

  update(update: TunnelUpdate): void {
    clearImmediate(this.updateDebounceImmediate);

    this.pendingUpdate = {...this.pendingUpdate, ...update};

    this.updateDebounceImmediate = setImmediate(() => this._update());
  }

  private _update(): void {
    const {snapshot, pendingUpdate} = this;

    if (!pendingUpdate) {
      return;
    }

    const {title, body} = pendingUpdate;

    if (!snapshot && !body) {
      return;
    }

    this.pendingUpdate = undefined;

    this.snapshot = snapshot
      ? {
          title: title ?? snapshot.title,
          body: body ?? snapshot.body,
        }
      : {
          title: title ?? INITIAL_TITLE,
          body: body!,
        };

    for (const [client, clientState] of this.clientStateMap) {
      this.sendUpdateToClient(client, clientState);
    }
  }

  private notifyTimeoutCallbackSet = new Set<TunnelNotifyTimeoutCallback>();

  private notifyTimeoutMap = new Map<string, NodeJS.Timeout>();

  onNotifyTimeout(callback: TunnelNotifyTimeoutCallback): void {
    this.notifyTimeoutCallbackSet.add(callback);
  }

  notify(
    notification: TunnelNotification,
    {timeout}: TunnelNotifyOptions,
  ): void {
    const {clientStateMap, notifyTimeoutMap} = this;

    if (timeout !== false && clientStateMap.size === 0) {
      this.emitNotifyTimeout(notification);
      return;
    }

    const id = randomUUID();

    for (const client of clientStateMap.keys()) {
      void client.send({
        type: 'notify',
        id,
        ...notification,
      });
    }

    if (timeout !== false) {
      const timer = setTimeout(() => {
        notifyTimeoutMap.delete(id);
        this.emitNotifyTimeout(notification);
      }, timeout);

      notifyTimeoutMap.set(id, timer);
    }
  }

  private emitNotifyTimeout(notification: TunnelNotification): void {
    for (const callback of this.notifyTimeoutCallbackSet) {
      callback(notification);
    }
  }

  private handleNotified({id}: FrontBackNotifiedMessage): void {
    const {notifyTimeoutMap} = this;

    const timer = notifyTimeoutMap.get(id);

    if (timer === undefined) {
      return;
    }

    clearTimeout(timer);

    notifyTimeoutMap.delete(id);
  }

  abstract getURL(): Promise<string>;

  abstract close(): void;

  protected addClient(client: TunnelClient): void {
    const clientState: ClientState = {
      idle: true,
      snapshot: undefined,
    };

    this.clientStateMap.set(client, clientState);

    client.onMessage(message => {
      switch (message.type) {
        case 'notified':
          this.handleNotified(message);
          break;
      }
    });

    this.sendUpdateToClient(client, clientState);
  }

  protected removeClient(client: TunnelClient): void {
    this.clientStateMap.delete(client);
  }

  private sendUpdateToClient(
    client: TunnelClient,
    clientState: ClientState,
  ): void {
    if (!clientState.idle) {
      return;
    }

    const {snapshot} = this;

    const [update, content] = getPageUpdateContent(
      clientState.snapshot,
      snapshot,
    );

    if (!update) {
      return;
    }

    const message: BackFrontMessage = {
      type: 'update',
      content,
    };

    clientState.idle = false;
    clientState.snapshot = snapshot;

    void client.send(message).then(() => {
      clientState.idle = true;

      if (snapshot !== this.snapshot) {
        this.sendUpdateToClient(client, clientState);
      }
    });
  }
}

export type TunnelNotifyTimeoutCallback = (
  notification: TunnelNotification,
) => void;

export type TunnelUpdate = {
  title?: string;
  body?: PlainNode;
};

export type TunnelNotification = {
  title: string;
  body?: string;
};

export type TunnelNotifyOptions = {
  timeout: number | false;
};

type ClientState = {
  idle: boolean;
  snapshot: PageSnapshot | undefined;
};

export abstract class TunnelClient {
  private messageCallbackSet = new Set<TunnelClientMessageCallback>();

  abstract send(message: BackFrontMessage): Promise<void>;

  onMessage(callback: TunnelClientMessageCallback): void {
    this.messageCallbackSet.add(callback);
  }

  protected emitMessage(message: FrontBackMessage): void {
    for (const callback of this.messageCallbackSet) {
      callback(message);
    }
  }
}

export type TunnelClientMessageCallback = (message: FrontBackMessage) => void;
