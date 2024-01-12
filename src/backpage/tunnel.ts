import type {BackFrontMessage} from '../shared/index.js';

export abstract class Tunnel {
  private clientStateMap = new Map<TunnelClient, ClientState>();

  private snapshot: Snapshot = {
    title: 'BackPage',
    html: '<div>BackPage</div>',
  };

  private pendingUpdate: Update | undefined;

  private updateDebounceImmediate: NodeJS.Immediate | undefined;

  update(update: Update): void {
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

    const {title, html} = pendingUpdate;

    if (title !== undefined && title !== snapshot.title) {
      snapshot = {...snapshot, title};
    }

    if (html !== undefined && html !== snapshot.html) {
      snapshot = {...snapshot, html};
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
    const clientState: ClientState = {idle: true};

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

    clientState.idle = false;

    const {snapshot} = this;

    void client.send({type: 'update', ...snapshot}).then(() => {
      clientState.idle = true;

      if (snapshot !== this.snapshot) {
        this.sendUpdateToClient(client, clientState);
      }
    });
  }
}

export type Update = {
  title?: string;
  html?: string;
};

type Snapshot = {
  title: string;
  html: string;
};

type ClientState = {
  idle: boolean;
};

export abstract class TunnelClient {
  abstract send(message: BackFrontMessage): Promise<void>;
}
