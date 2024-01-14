import {randomUUID} from 'crypto';

import DiffMatchPatch from 'diff-match-patch';
import {MultikeyMap} from 'multikey-map';

import type {
  BackFrontMessage,
  DiffMatchPatches,
  FrontBackMessage,
  FrontBackNotifiedMessage,
} from '../shared/index.js';

const dmp = new DiffMatchPatch();

dmp.Diff_Timeout = 0.05; // seconds

/**
 * @param timeout - The timeout in milliseconds.
 */
export function setTunnelDiffTimeout(timeout: number): void {
  dmp.Diff_Timeout = timeout / 1000;
}

export abstract class Tunnel {
  private clientStateMap = new Map<TunnelClient, ClientState>();

  private snapshot: Snapshot = {
    title: 'BackPage',
    content: undefined,
  };

  private pendingUpdate: TunnelUpdate | undefined;

  private updateDebounceImmediate: NodeJS.Immediate | undefined;

  update(update: TunnelUpdate): void {
    clearImmediate(this.updateDebounceImmediate);

    this.pendingUpdate = {...this.pendingUpdate, ...update};

    this.updateDebounceImmediate = setImmediate(() => this._update());
  }

  private _update(): void {
    let {snapshot, pendingUpdate} = this;

    if (!pendingUpdate) {
      return;
    }

    this.pendingUpdate = undefined;

    const {title, content} = pendingUpdate;

    if (title !== undefined && title !== snapshot.title) {
      snapshot = {...snapshot, title};
    }

    if (content !== undefined) {
      if (snapshot.content) {
        const patches = cachedDOMPatch(snapshot.content, content);

        if (patches.length > 0) {
          snapshot = {
            ...snapshot,
            content,
          };
        }
      } else {
        snapshot = {
          ...snapshot,
          content,
        };
      }
    }

    if (snapshot === this.snapshot) {
      return;
    }

    this.snapshot = snapshot;

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
      content: undefined,
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

    const message: BackFrontMessage = {
      type: 'update',
      title: snapshot.title,
      content: snapshot.content
        ? clientState.content
          ? cachedDOMPatch(clientState.content, snapshot.content)
          : snapshot.content.innerHTML
        : '',
    };

    clientState.idle = false;
    clientState.content = snapshot.content;

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
  content?: HTMLDivElement;
};

export type TunnelNotification = {
  title: string;
  body?: string;
};

export type TunnelNotifyOptions = {
  timeout: number | false;
};

type Snapshot = {
  title: string;
  content: HTMLDivElement | undefined;
};

type ClientState = {
  idle: boolean;
  content: HTMLDivElement | undefined;
};

const cachedDOMPatchesMap = new MultikeyMap<
  [HTMLElement, HTMLElement],
  DiffMatchPatches
>();

function cachedDOMPatch(
  elementA: HTMLElement,
  elementB: HTMLElement,
): DiffMatchPatches {
  const cachedDiffs = cachedDOMPatchesMap.get([elementA, elementB]);

  if (cachedDiffs) {
    return cachedDiffs;
  }

  const patches = dmp.patch_make(elementA.innerHTML, elementB.innerHTML);

  cachedDOMPatchesMap.set([elementA, elementB], patches);

  return patches;
}

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
