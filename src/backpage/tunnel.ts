import {randomUUID} from 'crypto';

import type {PlainNode} from 'plain-dom';
import type {WebSocket} from 'ws';

import type {
  BackFrontMessage,
  FrontBackActionMessage,
  FrontBackEvent,
  FrontBackEventMessage,
  FrontBackMessage,
  FrontBackNotifiedMessage,
  PageSettings,
  PageSnapshot,
} from '../shared/index.js';
import {getPageUpdateContent} from '../shared/index.js';

import type {ActionCallback} from './action.js';

const INITIAL_SETTINGS: PageSettings = {
  events: [],
};

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

  resetBody(): void {
    clearImmediate(this.updateDebounceImmediate);

    const {snapshot, pendingUpdate} = this;

    this.snapshot = undefined;

    this.pendingUpdate = {
      settings: pendingUpdate?.settings ?? snapshot?.settings,
      title: pendingUpdate?.title ?? snapshot?.title,
    };
  }

  private _update(): void {
    const {snapshot, pendingUpdate} = this;

    if (!pendingUpdate) {
      return;
    }

    const {settings, title, body} = pendingUpdate;

    if (!snapshot && !body) {
      return;
    }

    this.pendingUpdate = undefined;

    this.snapshot = snapshot
      ? {
          settings: settings ?? snapshot.settings,
          title: title ?? snapshot.title,
          body: body ?? snapshot.body,
        }
      : {
          settings: settings ?? INITIAL_SETTINGS,
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
        notification: {
          id,
          ...notification,
        },
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

  private handleNotified({notification: id}: FrontBackNotifiedMessage): void {
    const {notifyTimeoutMap} = this;

    const timer = notifyTimeoutMap.get(id);

    if (timer === undefined) {
      return;
    }

    clearTimeout(timer);

    notifyTimeoutMap.delete(id);
  }

  private notifyCallbackSet = new Set<TunnelNotifyCallback>();

  onNotify(callback: TunnelNotifyCallback): void {
    this.notifyCallbackSet.add(callback);
  }

  private emitNotify(
    notification: TunnelNotification,
    options: Partial<TunnelNotifyOptions>,
  ): void {
    for (const callback of this.notifyCallbackSet) {
      callback(notification, options);
    }
  }

  private eventCallbackSet = new Set<TunnelEventCallback>();

  onEvent(callback: TunnelEventCallback): void {
    this.eventCallbackSet.add(callback);
  }

  private emitEvent(event: FrontBackEvent): void {
    for (const callback of this.eventCallbackSet) {
      callback(event);
    }
  }

  private handleEvent({event}: FrontBackEventMessage): void {
    this.emitEvent(event);
  }

  private actionMap = new Map<string, ActionCallback<object>>();

  registerAction(name: string, action: ActionCallback<object>): () => void {
    const {actionMap} = this;

    actionMap.set(name, action);

    return () => {
      if (actionMap.get(name) === action) {
        actionMap.delete(name);
      }
    };
  }

  private handleAction({action: {name, data}}: FrontBackActionMessage): void {
    const action = this.actionMap.get(name);

    if (action === undefined) {
      throw new Error(`Unknown action: ${name}.`);
    }

    void action(data);
  }

  abstract getURL(): Promise<string>;

  abstract close(): void;

  protected handleMessage(message: FrontBackMessage): void {
    switch (message.type) {
      case 'notified':
        this.handleNotified(message);
        break;
      case 'action':
        this.handleAction(message);
        break;
      case 'notify':
        this.emitNotify(message.notification, {
          timeout: message.timeout,
        });
        break;
      case 'event':
        this.handleEvent(message);
        break;
    }
  }

  clientConnected = false;

  private onClientConnectedCallbackSet =
    new Set<TunnelClientConnectedCallback>();

  onClientConnected(callback: TunnelClientConnectedCallback): void {
    this.onClientConnectedCallbackSet.add(callback);
  }

  private emitClientConnected(): void {
    const {clientConnected} = this;

    for (const callback of this.onClientConnectedCallbackSet) {
      callback(clientConnected);
    }
  }

  protected addClient(client: TunnelClient): void {
    const {clientStateMap} = this;

    const clientState: ClientState = {
      idle: true,
      snapshot: undefined,
    };

    clientStateMap.set(client, clientState);

    this.sendUpdateToClient(client, clientState);

    if (!this.clientConnected) {
      this.clientConnected = true;
      this.emitClientConnected();
    }
  }

  protected removeClient(client: TunnelClient): void {
    this.clientStateMap.delete(client);

    if (this.clientStateMap.size === 0 && this.clientConnected) {
      this.clientConnected = false;
      this.emitClientConnected();
    }
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

export type TunnelUpdate = {
  settings?: PageSettings;
  title?: string;
  body?: PlainNode;
};

export type TunnelNotification = {
  title: string;
  body?: string;
};

export type TunnelNotifyTimeoutCallback = (
  notification: TunnelNotification,
) => void;

export type TunnelNotifyOptions = {
  timeout: number | false;
};

export type TunnelNotifyCallback = (
  notification: TunnelNotification,
  options: Partial<TunnelNotifyOptions>,
) => void;

export type TunnelEventCallback = (event: FrontBackEvent) => void;

export type TunnelClientConnectedCallback = (connected: boolean) => void;

type ClientState = {
  idle: boolean;
  snapshot: PageSnapshot | undefined;
};

export type TunnelClient = {
  send(message: BackFrontMessage): Promise<void>;
};

export class WebSocketTunnelClient implements TunnelClient {
  constructor(readonly ws: WebSocket) {}

  async send(message: BackFrontMessage): Promise<void> {
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

export type TunnelClientMessageCallback = (message: FrontBackMessage) => void;
