import DiffMatchPatch from 'diff-match-patch';
import {MultikeyMap} from 'multikey-map';

import type {BackFrontMessage, DiffMatchPatches} from '../shared/index.js';

import {window} from './@jsdom.js';

const INITIAL_CONTENT = window.document.createElement('div');

INITIAL_CONTENT.innerHTML = '<div>BackPage</div>';

const dmp = new DiffMatchPatch();

export abstract class Tunnel {
  private clientStateMap = new Map<TunnelClient, ClientState>();

  private snapshot: Snapshot = {
    title: 'BackPage',
    content: INITIAL_CONTENT,
  };

  private pendingUpdate: TunnelUpdate | undefined;

  private updateDebounceImmediate: NodeJS.Immediate | undefined;

  update(update: TunnelUpdate): void {
    clearImmediate(this.updateDebounceImmediate);

    this.pendingUpdate = {...this.pendingUpdate, ...update};

    this.updateDebounceImmediate = setImmediate(() => this._update());
  }

  notify(notification: TunnelNotification): void {
    for (const client of this.clientStateMap.keys()) {
      void client.send({
        type: 'notify',
        ...notification,
      });
    }
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
      const patches = cachedDOMPatch(snapshot.content, content);

      if (patches.length > 0) {
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

  abstract getURL(): Promise<string>;

  abstract close(): void;

  protected addClient(client: TunnelClient): void {
    const clientState: ClientState = {
      idle: true,
      content: undefined,
    };

    this.clientStateMap.set(client, clientState);

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
      content:
        clientState.content === undefined
          ? snapshot.content.innerHTML
          : cachedDOMPatch(clientState.content, snapshot.content),
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

export type TunnelUpdate = {
  title?: string;
  content?: HTMLDivElement;
};

export type TunnelNotification = {
  title: string;
  body?: string;
};

type Snapshot = {
  title: string;
  content: HTMLDivElement;
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
  abstract send(message: BackFrontMessage): Promise<void>;
}
